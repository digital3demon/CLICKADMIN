import "server-only";
import {
  EmailDirection,
  EmailFolderType,
  EmailSyncJobStatus,
  UserRole,
  type EmailAccount,
  type EmailFolder,
  type EmailSyncMode,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { encryptAppPassword } from "@/lib/mail/encryption";
import {
  deleteMessage,
  moveMessage,
  setMessageFlagged,
  setMessageSeen,
  setMessagesSeen,
  testImapConnection,
} from "@/lib/mail/imap-client";
import { emailFolderListWhere } from "@/lib/mail/mail-folder-query";
import {
  deleteMailAttachmentBytes,
  newMailAttachmentId,
  readMailAttachmentBytes,
  writeMailAttachmentBytes,
} from "@/lib/mail/mail-attachment-storage";
import {
  clampMailPageSize,
  decodeMailListCursor,
  encodeMailListCursor,
} from "@/lib/mail/mail-list-cursor";
import { previewFromMailBody, previewFromText, textFromHtml } from "@/lib/mail/mail-preview";
import { sendSmtpMessage, type MailSendAttachment } from "@/lib/mail/smtp-client";
import { syncEmailAccount, type MailSyncScope } from "@/lib/mail/mail-sync.service";

export type MailApiContext = {
  tenantId: string;
  userId: string;
  role: string;
  db: PrismaClient;
};

export type MailApiContextResult =
  | { ok: true; ctx: MailApiContext }
  | { ok: false; response: NextResponse };

export type EmailFilter = "all" | "unread" | "attachments" | "flagged" | "unflagged";

const SYSTEM_FOLDERS: Array<{
  imapName: string;
  displayName: string;
  type: EmailFolderType;
  sortOrder: number;
}> = [
  { imapName: "INBOX", displayName: "Входящие", type: EmailFolderType.INBOX, sortOrder: 10 },
  { imapName: "Sent", displayName: "Отправленные", type: EmailFolderType.SENT, sortOrder: 20 },
  { imapName: "Drafts", displayName: "Черновики", type: EmailFolderType.DRAFTS, sortOrder: 30 },
  { imapName: "Archive", displayName: "Архив", type: EmailFolderType.ARCHIVE, sortOrder: 40 },
  { imapName: "Spam", displayName: "Спам", type: EmailFolderType.SPAM, sortOrder: 50 },
  { imapName: "Trash", displayName: "Корзина", type: EmailFolderType.TRASH, sortOrder: 60 },
];

export function normalizeMailColor(value: unknown, fallback = "#6b7280"): string {
  if (typeof value !== "string") return fallback;
  const color = value.trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function normalizeUserRole(role: string): UserRole | null {
  return (Object.values(UserRole) as string[]).includes(role) ? (role as UserRole) : null;
}

function userAccountWhere(tenantId: string, userId: string, role?: string) {
  const normalizedRole = normalizeUserRole(role || "");
  return {
    tenantId,
    isActive: true,
    OR: [
      { createdByUserId: userId },
      ...(normalizedRole ? [{ allowedRoles: { has: normalizedRole } }] : []),
    ],
  };
}

export function mailAccountAccessWhere(tenantId: string, userId: string, role: string) {
  return userAccountWhere(tenantId, userId, role);
}

async function requireUserEmailAccount(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
  role?: string,
) {
  const account = await db.emailAccount.findFirst({
    where: { id: accountId, ...userAccountWhere(tenantId, userId, role) },
  });
  if (!account) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  return account;
}

export async function getMailApiContext(): Promise<MailApiContextResult> {
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  if (!session?.sub || !tenantId || session.demo) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Требуется вход" }, { status: 401 }),
    };
  }
  return {
    ok: true,
    ctx: {
      tenantId,
      userId: session.sub,
      role: session.role,
      db: (await getOrdersPrisma()) as PrismaClient,
    },
  };
}

export function stringField(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export { previewFromText, textFromHtml, previewFromMailBody } from "@/lib/mail/mail-preview";

import { sanitizeMailHtml } from "@/lib/mail/sanitize-mail-html";

export { sanitizeMailHtml } from "@/lib/mail/sanitize-mail-html";

function normalizeContentId(value: string | null | undefined): string {
  if (!value) return "";
  const stripped = value.trim().replace(/^<|>$/g, "");
  try {
    return decodeURIComponent(stripped).toLowerCase();
  } catch {
    return stripped.toLowerCase();
  }
}

function inlineCidImages(
  html: string,
  emailId: string,
  attachments: Array<{ id: string; contentId: string | null; isInline: boolean }>,
): string {
  const byContentId = new Map<string, string>();
  for (const attachment of attachments) {
    const cid = normalizeContentId(attachment.contentId);
    if (!cid) continue;
    byContentId.set(
      cid,
      `/api/mail/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachment.id)}?inline=1`,
    );
  }
  if (byContentId.size === 0) return html;

  return html
    .replace(/\s(src)\s*=\s*(["'])cid:([^"']+)\2/gi, (match, attr: string, quote: string, rawCid: string) => {
      const url = byContentId.get(normalizeContentId(rawCid));
      return url ? ` ${attr}=${quote}${url}${quote}` : match;
    })
    .replace(/\s(src)\s*=\s*cid:([^\s>]+)/gi, (match, attr: string, rawCid: string) => {
      const url = byContentId.get(normalizeContentId(rawCid));
      return url ? ` ${attr}="${url}"` : match;
    });
}

function parseRecipientLine(value: string): Array<{ address: string; name: string | null }> {
  return value
    .split(/[;,]/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const match = /^(.*?)<([^>]+)>$/.exec(raw);
      if (!match) return { address: raw, name: null };
      return {
        name: match[1]?.trim().replace(/^"|"$/g, "") || null,
        address: match[2]?.trim() || raw,
      };
    });
}

async function ensureSystemFolders(
  db: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<void> {
  for (const folder of SYSTEM_FOLDERS) {
    await db.emailFolder.upsert({
      where: { accountId_imapName: { accountId, imapName: folder.imapName } },
      create: { tenantId, accountId, ...folder },
      update: {
        displayName: folder.displayName,
        type: folder.type,
        sortOrder: folder.sortOrder,
      },
    });
  }
}

async function folderByType(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  type: EmailFolderType,
) {
  await requireUserEmailAccount(db, tenantId, userId, accountId, role);
  const existing = await db.emailFolder.findFirst({
    where: { tenantId, accountId, type, account: userAccountWhere(tenantId, userId, role) },
    orderBy: { sortOrder: "asc" },
  });
  if (existing) return existing;
  const fallback = SYSTEM_FOLDERS.find((f) => f.type === type) ?? SYSTEM_FOLDERS[0]!;
  return db.emailFolder.create({
    data: { tenantId, accountId, ...fallback },
  });
}

export async function refreshFolderCounters(
  db: PrismaClient,
  tenantId: string,
  folderId: string,
): Promise<void> {
  const folder = await db.emailFolder.findFirst({
    where: { id: folderId, tenantId },
    select: { id: true, type: true, accountId: true },
  });
  if (!folder) return;
  const where = emailFolderListWhere(tenantId, folder, folder.accountId);
  const [totalCount, unreadCount] = await Promise.all([
    db.email.count({ where }),
    db.email.count({ where: { ...where, isRead: false } }),
  ]);
  await db.emailFolder.update({ where: { id: folderId }, data: { totalCount, unreadCount } });
}

export async function refreshLabelCounters(
  db: PrismaClient,
  tenantId: string,
  labelId: string,
): Promise<void> {
  const [totalCount, unreadCount] = await Promise.all([
    db.emailLabelAssignment.count({ where: { tenantId, labelId } }),
    db.emailLabelAssignment.count({
      where: { tenantId, labelId, email: { isRead: false } },
    }),
  ]);
  await db.emailLabel.update({ where: { id: labelId }, data: { totalCount, unreadCount } });
}

const mailFolderTreeSelect = {
  id: true,
  imapName: true,
  displayName: true,
  color: true,
  type: true,
  unreadCount: true,
  totalCount: true,
  sortOrder: true,
  parentId: true,
} as const;

const mailLabelTreeSelect = {
  id: true,
  name: true,
  color: true,
  unreadCount: true,
  totalCount: true,
  sortOrder: true,
} as const;

const mailAccountTreeSelect = {
  id: true,
  email: true,
  displayName: true,
  isActive: true,
  lastSyncAt: true,
  lastSyncError: true,
  allowedRoles: true,
  hoverPreviewEnabled: true,
  createdByUserId: true,
  encryptedAppPassword: true,
  folders: {
    select: mailFolderTreeSelect,
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }] satisfies Prisma.EmailFolderOrderByWithRelationInput[],
  },
  labels: {
    select: mailLabelTreeSelect,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }] satisfies Prisma.EmailLabelOrderByWithRelationInput[],
  },
} satisfies Prisma.EmailAccountSelect;

export async function listEmailAccounts(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  options: { lite?: boolean; tree?: boolean } = {},
) {
  const accountWhere = userAccountWhere(tenantId, userId, role);
  const accountOrderBy = [{ email: "asc" as const }, { createdAt: "desc" as const }];
  const accounts = options.tree
    ? await db.emailAccount.findMany({
        where: accountWhere,
        orderBy: accountOrderBy,
        select: mailAccountTreeSelect,
      })
    : options.lite
      ? await db.emailAccount.findMany({
          where: accountWhere,
          orderBy: accountOrderBy,
          select: {
            id: true,
            email: true,
            displayName: true,
            isActive: true,
            lastSyncAt: true,
            lastSyncError: true,
            allowedRoles: true,
            hoverPreviewEnabled: true,
            createdByUserId: true,
            encryptedAppPassword: true,
          },
        })
      : await db.emailAccount.findMany({
          where: accountWhere,
          orderBy: accountOrderBy,
          include: {
            folders: { orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }] },
            labels: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
          },
        });
  const byEmail = new Map<string, (typeof accounts)[number]>();
  for (const account of accounts) {
    const key = account.email.trim().toLowerCase();
    const prev = byEmail.get(key);
    if (!prev || account.createdByUserId === userId) {
      byEmail.set(key, account);
    }
  }
  const uniqueAccounts = [...byEmail.values()];
  if (!options.lite && !options.tree) {
    await Promise.all(
      uniqueAccounts.map(async (account) => {
        const accountWithFolders = account as typeof account & { folders?: EmailFolderRow[] };
        if (!Array.isArray(accountWithFolders.folders)) return;
        (account as typeof account & { folders?: MailFolderDto[] }).folders =
          accountWithFolders.folders.map((folder) => toMailFolderDto(folder));
      }),
    );
  }
  return uniqueAccounts.map(({ encryptedAppPassword, ...account }) => {
    const safeAccount = account as typeof account & {
      folders?: MailFolderDto[] | EmailFolderRow[];
      labels?: unknown[];
    };
    const folders = (safeAccount.folders ?? []).map((folder) =>
      toMailFolderDto(folder as EmailFolderRow),
    );
    return {
      ...safeAccount,
      folders,
      labels: safeAccount.labels ?? [],
      hasPassword: Boolean(encryptedAppPassword),
    };
  });
}

export function resolveDefaultInboxFolderId(
  account: { folders: Array<{ id: string; type: EmailFolderType; sortOrder: number; totalCount?: number; unreadCount?: number }> },
): string | null {
  const inboxes = account.folders.filter((folder) => folder.type === EmailFolderType.INBOX);
  return (
    inboxes.find((folder) => (folder.totalCount ?? 0) > 0 || (folder.unreadCount ?? 0) > 0)?.id ??
    inboxes[0]?.id ??
    account.folders.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ??
    null
  );
}

export async function mailBootstrap(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  input: {
    accountId?: string | null;
    folderId?: string | null;
    filter?: EmailFilter;
    take?: number;
  } = {},
) {
  const accounts = await listEmailAccounts(db, tenantId, userId, role, { tree: true });
  const accountId =
    input.accountId && accounts.some((account) => account.id === input.accountId)
      ? input.accountId
      : accounts[0]?.id ?? null;
  const account = accountId ? accounts.find((item) => item.id === accountId) ?? null : null;
  const folderId =
    input.folderId && account?.folders.some((folder) => folder.id === input.folderId)
      ? input.folderId
      : account
        ? resolveDefaultInboxFolderId(account)
        : null;
  if (accountId && account && !account.folders.length) {
    await ensureSystemFolders(db, tenantId, accountId);
    const refreshed = await listEmailAccounts(db, tenantId, userId, role, { tree: true });
    const nextAccount = refreshed.find((item) => item.id === accountId) ?? account;
    const nextFolderId = resolveDefaultInboxFolderId(nextAccount);
    const list =
      nextFolderId && accountId
        ? await listEmails(db, tenantId, userId, role, {
            accountId,
            folderId: nextFolderId,
            filter: input.filter ?? "all",
            take: input.take ?? 80,
          })
        : null;
    return {
      accounts: refreshed,
      accountId,
      folderId: nextFolderId,
      emails: list?.emails ?? [],
      nextCursor: list?.nextCursor ?? null,
    };
  }
  const list =
    accountId && folderId
      ? await listEmails(db, tenantId, userId, role, {
          accountId,
          folderId,
          filter: input.filter ?? "all",
          take: input.take ?? 80,
        })
      : null;
  return {
    accounts,
    accountId,
    folderId,
    emails: list?.emails ?? [],
    nextCursor: list?.nextCursor ?? null,
  };
}

export async function mailUnreadSummary(db: PrismaClient, tenantId: string, userId: string, role: string) {
  const result = await db.emailFolder.aggregate({
    where: {
      tenantId,
      type: EmailFolderType.INBOX,
      account: mailAccountAccessWhere(tenantId, userId, role),
    },
    _sum: { unreadCount: true },
  });
  return { unreadCount: Math.max(0, result._sum.unreadCount ?? 0) };
}

export async function upsertEmailAccount(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  input: {
    email: string;
    displayName?: string | null;
    appPassword?: string | null;
  },
) {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("INVALID_EMAIL_ACCOUNT");
  }
  const account = await db.emailAccount.upsert({
    where: { tenantId_createdByUserId_email: { tenantId, createdByUserId: userId, email } },
    create: {
      tenantId,
      createdByUserId: userId,
      email,
      displayName: input.displayName || null,
      encryptedAppPassword: input.appPassword ? encryptAppPassword(input.appPassword) : null,
      passwordUpdatedAt: input.appPassword ? new Date() : null,
    },
    update: {
      displayName: input.displayName || null,
      isActive: true,
      ...(input.appPassword
        ? {
            encryptedAppPassword: encryptAppPassword(input.appPassword),
            passwordUpdatedAt: new Date(),
          }
        : {}),
    },
  });
  if (input.appPassword) {
    await Promise.all([
      db.emailFolder.updateMany({
        where: { tenantId, accountId: account.id },
        data: { lastSyncedUid: null, lastBackfillUid: null },
      }),
      db.emailSyncJob.deleteMany({
        where: {
          tenantId,
          accountId: account.id,
          status: { in: [EmailSyncJobStatus.QUEUED, EmailSyncJobStatus.RUNNING] },
        },
      }),
    ]);
  }
  await ensureSystemFolders(db, tenantId, account.id);
  return account;
}

export const MAIL_ACCOUNT_ACCESS_ROLES: UserRole[] = Object.values(UserRole);

function normalizeAllowedMailRoles(value: unknown): UserRole[] {
  const roles = Array.isArray(value) ? value : [];
  const allowed = roles.filter((role): role is UserRole => normalizeUserRole(String(role)) !== null);
  return Array.from(new Set<UserRole>([UserRole.OWNER, ...allowed]));
}

export async function updateEmailAccountAccessRoles(
  db: PrismaClient,
  tenantId: string,
  role: string,
  accountId: string,
  allowedRolesInput: unknown,
  hoverPreviewEnabledInput?: unknown,
) {
  if (role !== UserRole.OWNER) throw new Error("MAIL_ACCOUNT_ACCESS_FORBIDDEN");
  const allowedRoles = normalizeAllowedMailRoles(allowedRolesInput);
  const hoverPreviewEnabled =
    typeof hoverPreviewEnabledInput === "boolean" ? hoverPreviewEnabledInput : undefined;
  const updated = await db.emailAccount.updateMany({
    where: { id: accountId, tenantId },
    data: {
      allowedRoles,
      ...(hoverPreviewEnabled === undefined ? {} : { hoverPreviewEnabled }),
    },
  });
  if (!updated.count) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  return { id: accountId, allowedRoles, hoverPreviewEnabled };
}

/** Удаляет ящик и всю CRM-копию почты (письма, папки, метки, правила, jobs). Яндекс.Почта не затрагивается. */
export async function deleteEmailAccount(
  db: PrismaClient,
  tenantId: string,
  _userId: string,
  role: string,
  accountId: string,
): Promise<void> {
  if (role !== UserRole.OWNER) throw new Error("MAIL_ACCOUNT_ACCESS_FORBIDDEN");
  const account = await db.emailAccount.findFirst({
    where: { id: accountId, tenantId },
    select: { id: true },
  });
  if (!account) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");

  const { forceResetMailSyncJobs } = await import("@/lib/mail/mail-queue");
  await forceResetMailSyncJobs(db, { tenantId, accountId });

  const attachments = await db.emailAttachment.findMany({
    where: { tenantId, email: { accountId } },
    select: { diskRelPath: true },
  });
  await Promise.all(
    attachments.map((row) =>
      deleteMailAttachmentBytes(row.diskRelPath).catch(() => undefined),
    ),
  );

  await db.emailAccount.delete({ where: { id: accountId } });
}

export async function testEmailAccountConnection(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
): Promise<void> {
  const account = await requireUserEmailAccount(db, tenantId, userId, accountId, role);
  await testImapConnection(account);
}

export async function diagnoseEmailAccount(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
) {
  const account = await requireUserEmailAccount(db, tenantId, userId, accountId, role);
  const { diagnoseEmailAccountImap } = await import("@/lib/mail/mail-diagnose");
  return diagnoseEmailAccountImap(db, account);
}

export type { MailSyncScope } from "@/lib/mail/mail-sync.service";

export async function syncAccountNow(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  options: { mode?: EmailSyncMode; scope?: MailSyncScope } = {},
) {
  const account = await requireUserEmailAccount(db, tenantId, userId, accountId, role);
  await ensureSystemFolders(db, tenantId, account.id);
  return syncEmailAccount(db, account, options);
}

type EmailFolderRow = Awaited<
  ReturnType<PrismaClient["emailFolder"]["findMany"]>
>[number];

export type MailFolderDto = Omit<EmailFolder, "uidValidity">;

/** uidValidity (BigInt) только для синка; в API не отдаём — ломает JSON. */
export function toMailFolderDto(folder: EmailFolderRow): MailFolderDto {
  const { uidValidity: _uidValidity, ...rest } = folder;
  return rest;
}

export async function listEmailFolders(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
): Promise<MailFolderDto[]> {
  await requireUserEmailAccount(db, tenantId, userId, accountId, role);
  await ensureSystemFolders(db, tenantId, accountId);
  const folders = await db.emailFolder.findMany({
    where: { tenantId, accountId },
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
  });
  return folders.map(toMailFolderDto);
}

export async function createEmailFolder(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  displayName: string,
  color = "#6b7280",
) {
  await requireUserEmailAccount(db, tenantId, userId, accountId, role);
  const name = displayName.trim().slice(0, 120);
  if (!name) throw new Error("EMPTY_FOLDER_NAME");
  return db.emailFolder.create({
    data: {
      tenantId,
      accountId,
      imapName: name,
      displayName: name,
      color: normalizeMailColor(color),
      type: EmailFolderType.CUSTOM,
      sortOrder: 200,
    },
  });
}

export async function listEmailLabels(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
) {
  await requireUserEmailAccount(db, tenantId, userId, accountId, role);
  return db.emailLabel.findMany({
    where: { tenantId, accountId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createEmailLabel(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  input: { name: string; color: string },
) {
  await requireUserEmailAccount(db, tenantId, userId, accountId, role);
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("EMPTY_LABEL_NAME");
  return db.emailLabel.create({
    data: {
      tenantId,
      accountId,
      name,
      color: input.color || "#ffcc00",
      sortOrder: 100,
    },
  });
}

export async function listEmailRules(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId?: string | null,
) {
  if (accountId) await requireUserEmailAccount(db, tenantId, userId, accountId, role);
  return db.emailRule.findMany({
    where: {
      tenantId,
      account: userAccountWhere(tenantId, userId, role),
      ...(accountId ? { accountId } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      account: { select: { id: true, email: true, displayName: true } },
    },
  });
}

export async function createEmailRule(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  input: {
    accountId: string;
    name: string;
    conditions: unknown;
    actions: unknown;
  },
) {
  const account = await requireUserEmailAccount(db, tenantId, userId, input.accountId, role);
  const name = input.name.trim().slice(0, 160);
  if (!name) throw new Error("EMPTY_RULE_NAME");
  const last = await db.emailRule.findFirst({
    where: { tenantId, accountId: account.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return db.emailRule.create({
    data: {
      tenantId,
      accountId: account.id,
      name,
      sortOrder: (last?.sortOrder ?? 0) + 10,
      conditions:
        input.conditions && typeof input.conditions === "object"
          ? input.conditions
          : { from: "", subject: "", body: "" },
      actions:
        input.actions && typeof input.actions === "object"
          ? input.actions
          : { markImportant: false, labelIds: [], moveToFolderId: null },
    },
  });
}

export async function updateEmailRule(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  ruleId: string,
  input: {
    name?: string | null;
    isActive?: boolean | null;
    conditions?: unknown;
    actions?: unknown;
    sortOrder?: number | null;
  },
) {
  const data: Parameters<typeof db.emailRule.updateMany>[0]["data"] = {};
  if (typeof input.name === "string" && input.name.trim()) {
    data.name = input.name.trim().slice(0, 160);
  }
  if (typeof input.isActive === "boolean") data.isActive = input.isActive;
  if (typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)) {
    data.sortOrder = Math.trunc(input.sortOrder);
  }
  if (input.conditions && typeof input.conditions === "object") data.conditions = input.conditions;
  if (input.actions && typeof input.actions === "object") data.actions = input.actions;
  const updated = await db.emailRule.updateMany({
    where: { id: ruleId, tenantId, account: userAccountWhere(tenantId, userId, role) },
    data,
  });
  if (!updated.count) throw new Error("EMAIL_RULE_NOT_FOUND");
  return db.emailRule.findFirst({
    where: { id: ruleId, tenantId, account: userAccountWhere(tenantId, userId, role) },
  });
}

export async function deleteEmailRule(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  ruleId: string,
): Promise<void> {
  await db.emailRule.deleteMany({
    where: { id: ruleId, tenantId, account: userAccountWhere(tenantId, userId, role) },
  });
}

const emailListSelect = {
  id: true,
  accountId: true,
  folderId: true,
  direction: true,
  isRead: true,
  isFlagged: true,
  hasAttachments: true,
  fromName: true,
  fromAddress: true,
  subject: true,
  preview: true,
  receivedAt: true,
  sentAt: true,
  createdAt: true,
  labelAssignments: {
    select: {
      label: {
        select: {
          id: true,
          accountId: true,
          name: true,
          color: true,
          unreadCount: true,
          totalCount: true,
          sortOrder: true,
        },
      },
    },
  },
  sourceOrderLinks: {
    take: 1,
    orderBy: { createdAt: "desc" as const },
    select: {
      order: { select: { orderNumber: true } },
    },
  },
  _count: {
    select: { attachments: true, sourceOrderLinks: true },
  },
} satisfies Prisma.EmailSelect;

type EmailListRow = Prisma.EmailGetPayload<{ select: typeof emailListSelect }>;

export function mapEmailListRow(email: EmailListRow) {
  return {
    id: email.id,
    accountId: email.accountId,
    folderId: email.folderId,
    direction: email.direction,
    isRead: email.isRead,
    isFlagged: email.isFlagged,
    hasAttachments: email.hasAttachments,
    fromName: email.fromName,
    fromAddress: email.fromAddress,
    subject: email.subject,
    preview: email.preview?.trim() || null,
    receivedAt: email.receivedAt,
    sentAt: email.sentAt,
    createdAt: email.createdAt,
    hasLinkedOrder: email._count.sourceOrderLinks > 0,
    linkedOrderNumber: email.sourceOrderLinks[0]?.order.orderNumber ?? null,
    labelAssignments: email.labelAssignments,
    _count: {
      attachments: email._count.attachments,
      sourceOrderLinks: email._count.sourceOrderLinks,
    },
  };
}

export async function listEmails(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  input: {
    accountId: string;
    folderId?: string | null;
    labelId?: string | null;
    q?: string | null;
    filter?: EmailFilter;
    take?: number;
    cursor?: string | null;
  },
) {
  await requireUserEmailAccount(db, tenantId, userId, input.accountId, role);
  const take = clampMailPageSize(input.take);
  const cursor = decodeMailListCursor(input.cursor);
  const folder = input.folderId
    ? await db.emailFolder.findFirst({
        where: { id: input.folderId, tenantId, accountId: input.accountId },
        select: { id: true, type: true, accountId: true },
      })
    : null;
  const rows = await db.email.findMany({
    where: {
      accountId: input.accountId,
      ...(input.folderId && folder
        ? emailFolderListWhere(tenantId, folder, input.accountId)
        : { tenantId }),
      ...(input.labelId
        ? {
            labelAssignments: {
              some: {
                tenantId,
                labelId: input.labelId,
                label: { accountId: input.accountId },
              },
            },
          }
        : {}),
      ...(input.filter === "unread" ? { isRead: false } : {}),
      ...(input.filter === "attachments" ? { hasAttachments: true } : {}),
      ...(input.filter === "flagged" ? { isFlagged: true } : {}),
      ...(input.filter === "unflagged" ? { isFlagged: false } : {}),
      ...(cursor
        ? {
            AND: [
              {
                OR: [
                  { receivedAt: { lt: new Date(cursor.r) } },
                  { receivedAt: new Date(cursor.r), id: { lt: cursor.i } },
                ],
              },
            ],
          }
        : {}),
      ...(input.q
        ? {
            OR: [
              { subject: { contains: input.q, mode: "insensitive" } },
              { preview: { contains: input.q, mode: "insensitive" } },
              { fromName: { contains: input.q, mode: "insensitive" } },
              { fromAddress: { contains: input.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: emailListSelect,
  });
  const emails = rows.slice(0, take);
  const last = emails.at(-1);
  return {
    emails: emails.map(mapEmailListRow),
    nextCursor:
      rows.length > take && last
        ? encodeMailListCursor(last.receivedAt ?? last.sentAt ?? last.createdAt, last.id, last.isFlagged)
        : null,
  };
}

async function setEmailSeenOnServerBestEffort(
  db: PrismaClient,
  tenantId: string,
  email: {
    uid: number | null;
    direction: EmailDirection;
    accountId: string;
    account: {
      email: string;
      encryptedAppPassword: string | null;
      imapHost: string;
      imapPort: number;
      imapSecure: boolean;
    };
    folder: { imapName: string; type: EmailFolderType } | null;
  },
  seen: boolean,
): Promise<void> {
  if (!email.uid || !email.account.encryptedAppPassword) return;
  const paths = new Set<string>();
  if (email.folder?.imapName) paths.add(email.folder.imapName);
  if (email.direction === EmailDirection.INBOUND && email.folder?.type !== EmailFolderType.INBOX) {
    const inbox = await db.emailFolder.findFirst({
      where: { tenantId, accountId: email.accountId, type: EmailFolderType.INBOX },
      select: { imapName: true },
    });
    if (inbox?.imapName) paths.add(inbox.imapName);
  }
  for (const path of paths) {
    try {
      await setMessageSeen(email.account, path, email.uid, seen);
      return;
    } catch {
      // CRM folders can be classification-only while the original IMAP message
      // still lives in INBOX. Try the next plausible server folder.
    }
  }
}

async function setEmailsSeenOnServerBestEffort(
  db: PrismaClient,
  tenantId: string,
  emails: Array<{
    uid: number | null;
    direction: EmailDirection;
    accountId: string;
    account: {
      id: string;
      email: string;
      encryptedAppPassword: string | null;
      imapHost: string;
      imapPort: number;
      imapSecure: boolean;
    };
    folder: { imapName: string; type: EmailFolderType } | null;
  }>,
  seen: boolean,
): Promise<void> {
  const inboxByAccountId = new Map<string, string | null>();
  const groups = new Map<string, { account: (typeof emails)[number]["account"]; path: string; uids: number[] }>();
  for (const email of emails) {
    if (!email.uid || !email.account.encryptedAppPassword) continue;
    const paths = new Set<string>();
    if (email.folder?.imapName) paths.add(email.folder.imapName);
    if (email.direction === EmailDirection.INBOUND && email.folder?.type !== EmailFolderType.INBOX) {
      if (!inboxByAccountId.has(email.accountId)) {
        const inbox = await db.emailFolder.findFirst({
          where: { tenantId, accountId: email.accountId, type: EmailFolderType.INBOX },
          select: { imapName: true },
        });
        inboxByAccountId.set(email.accountId, inbox?.imapName ?? null);
      }
      const inboxPath = inboxByAccountId.get(email.accountId);
      if (inboxPath) paths.add(inboxPath);
    }
    for (const path of paths) {
      const key = `${email.account.id}:${path}`;
      const group = groups.get(key) ?? { account: email.account, path, uids: [] };
      group.uids.push(email.uid);
      groups.set(key, group);
    }
  }
  for (const group of groups.values()) {
    try {
      await setMessagesSeen(group.account, group.path, group.uids, seen);
    } catch {
      // DB state still records the explicit CRM action; later reconcile/sync can
      // repair transient IMAP failures without blocking the operator.
    }
  }
}

export async function getEmailDetail(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  emailId: string,
  markRead = true,
) {
  const email = await db.email.findFirst({
    where: { id: emailId, tenantId, account: userAccountWhere(tenantId, userId, role) },
    include: {
      account: {
        select: {
          id: true,
          email: true,
          displayName: true,
          encryptedAppPassword: true,
          imapHost: true,
          imapPort: true,
          imapSecure: true,
        },
      },
      folder: true,
      attachments: {
        select: { id: true, fileName: true, mimeType: true, size: true, contentId: true, isInline: true },
      },
      labelAssignments: { include: { label: true } },
      sourceOrderLinks: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { order: { select: { orderNumber: true } } },
      },
      _count: { select: { attachments: true, sourceOrderLinks: true } },
    },
  });
  if (!email) throw new Error("EMAIL_NOT_FOUND");
  if (markRead && !email.isRead) {
    await db.email.update({
      where: { id: email.id },
      data: { isRead: true, readAt: new Date() },
    });
    void setEmailSeenOnServerBestEffort(db, tenantId, email, true);
    if (email.folderId) {
      await refreshFolderCounters(db, tenantId, email.folderId).catch(() => undefined);
    }
    await Promise.all(
      email.labelAssignments.map((assignment) => refreshLabelCounters(db, tenantId, assignment.labelId).catch(() => undefined)),
    );
  }
  const sanitizedHtml = sanitizeMailHtml(email.htmlBody);
  const { encryptedAppPassword: _encryptedAppPassword, imapHost: _imapHost, imapPort: _imapPort, imapSecure: _imapSecure, ...safeAccount } = email.account;
  return {
    ...email,
    account: safeAccount,
    folder: email.folder ? toMailFolderDto(email.folder) : null,
    isRead: markRead ? true : email.isRead,
    readAt: markRead && !email.isRead ? new Date() : email.readAt,
    hasLinkedOrder: email._count.sourceOrderLinks > 0,
    linkedOrderNumber: email.sourceOrderLinks[0]?.order.orderNumber ?? null,
    safeHtmlBody: inlineCidImages(sanitizedHtml, email.id, email.attachments),
  };
}

export async function getEmailAttachment(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  emailId: string,
  attachmentId: string,
) {
  const attachment = await db.emailAttachment.findFirst({
    where: {
      id: attachmentId,
      emailId,
      tenantId,
      email: { account: userAccountWhere(tenantId, userId, role) },
    },
  });
  if (!attachment) throw new Error("EMAIL_ATTACHMENT_NOT_FOUND");
  return {
    ...attachment,
    data: await readMailAttachmentBytes(attachment),
  };
}

export async function bulkEmailAction(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  input: {
    ids: string[];
    action: "read" | "unread" | "flag" | "unflag" | "archive" | "trash" | "delete" | "move" | "markAllRead";
    accountId?: string | null;
    targetFolderId?: string | null;
  },
) {
  if (input.action === "markAllRead") {
    if (!input.accountId) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
    await requireUserEmailAccount(db, tenantId, userId, input.accountId, role);
    const unreadEmails = await db.email.findMany({
      where: {
        tenantId,
        accountId: input.accountId,
        isRead: false,
        account: userAccountWhere(tenantId, userId, role),
      },
      include: {
        account: true,
        folder: true,
      },
    });
    await setEmailsSeenOnServerBestEffort(db, tenantId, unreadEmails, true);
    const res = await db.email.updateMany({
      where: {
        tenantId,
        accountId: input.accountId,
        isRead: false,
        account: userAccountWhere(tenantId, userId, role),
      },
      data: { isRead: true, readAt: new Date() },
    });
    const [folders, labels] = await Promise.all([
      db.emailFolder.findMany({
        where: { tenantId, accountId: input.accountId },
        select: { id: true },
      }),
      db.emailLabel.findMany({
        where: { tenantId, accountId: input.accountId },
        select: { id: true },
      }),
    ]);
    await Promise.all([
      ...folders.map((folder) => refreshFolderCounters(db, tenantId, folder.id)),
      ...labels.map((label) => refreshLabelCounters(db, tenantId, label.id)),
    ]);
    return { updated: res.count };
  }

  const ids = input.ids.filter(Boolean).slice(0, 500);
  if (!ids.length) return { updated: 0 };
  const accountAccessWhere = userAccountWhere(tenantId, userId, role);
  const before = await db.email.findMany({
    where: { tenantId, id: { in: ids }, account: accountAccessWhere },
    include: {
      account: true,
      folder: true,
      labelAssignments: { select: { labelId: true } },
    },
  });

  let updated = 0;
  if (input.action === "delete") {
    const attachments = await db.emailAttachment.findMany({
      where: {
        tenantId,
        emailId: { in: ids },
        email: { account: accountAccessWhere },
      },
      select: { diskRelPath: true },
    });
    for (const email of before) {
      if (email.uid && email.folder?.imapName) {
        await deleteMessage(email.account, email.folder.imapName, email.uid);
      }
    }
    const res = await db.email.deleteMany({
      where: { tenantId, id: { in: ids }, account: accountAccessWhere },
    });
    await Promise.all(attachments.map((a) => deleteMailAttachmentBytes(a.diskRelPath)));
    updated = res.count;
  } else if (input.action === "archive" || input.action === "trash" || input.action === "move") {
    const accountId = input.accountId || before[0]?.accountId;
    if (!accountId) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
    const target =
      input.action === "move" && input.targetFolderId
        ? await db.emailFolder.findFirst({
            where: {
              id: input.targetFolderId,
              tenantId,
              accountId,
              account: accountAccessWhere,
            },
          })
        : await folderByType(
            db,
            tenantId,
            userId,
            role,
            accountId,
            input.action === "archive" ? EmailFolderType.ARCHIVE : EmailFolderType.TRASH,
          );
    if (!target) throw new Error("EMAIL_FOLDER_NOT_FOUND");
    for (const email of before) {
      let movedUid: number | null = null;
      if (email.uid && email.folder?.imapName && target.imapName) {
        movedUid = await moveMessage(email.account, email.folder.imapName, email.uid, target.imapName);
      }
      const res = await db.email.updateMany({
        where: { tenantId, id: email.id, account: accountAccessWhere },
        data: { folderId: target.id, ...(movedUid ? { uid: movedUid } : {}) },
      });
      updated += res.count;
    }
  } else {
    for (const email of before) {
      if (input.action === "read" || input.action === "unread") {
        await setEmailSeenOnServerBestEffort(db, tenantId, email, input.action === "read");
      } else {
        if (!email.uid || !email.folder?.imapName) continue;
        await setMessageFlagged(email.account, email.folder.imapName, email.uid, input.action === "flag");
      }
    }
    const res = await db.email.updateMany({
      where: { tenantId, id: { in: ids }, account: accountAccessWhere },
      data:
        input.action === "read"
          ? { isRead: true, readAt: new Date() }
          : input.action === "unread"
            ? { isRead: false, readAt: null }
            : input.action === "flag"
              ? { isFlagged: true }
              : { isFlagged: false },
    });
    updated = res.count;
  }

  const folders = new Set(before.map((e) => e.folderId).filter((x): x is string => Boolean(x)));
  const labels = new Set(before.flatMap((e) => e.labelAssignments.map((assignment) => assignment.labelId)));
  const after = await db.email.findMany({
    where: { tenantId, id: { in: ids }, account: accountAccessWhere },
    select: { folderId: true, labelAssignments: { select: { labelId: true } } },
  });
  for (const folderId of after.map((e) => e.folderId)) {
    if (folderId) folders.add(folderId);
  }
  for (const email of after) {
    for (const assignment of email.labelAssignments) labels.add(assignment.labelId);
  }
  await Promise.all([
    ...[...folders].map((folderId) => refreshFolderCounters(db, tenantId, folderId)),
    ...[...labels].map((labelId) => refreshLabelCounters(db, tenantId, labelId)),
  ]);
  return { updated };
}

export async function sendEmail(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  input: {
    accountId: string;
    to: string;
    cc?: string | null;
    bcc?: string | null;
    subject: string;
    html: string;
    attachments: MailSendAttachment[];
    inReplyTo?: string | null;
    references?: string | null;
    threadId?: string | null;
  },
) {
  const account = await requireUserEmailAccount(db, tenantId, userId, input.accountId, role);
  const text = textFromHtml(input.html);
  const sent = await sendSmtpMessage(account, {
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    html: input.html,
    text,
    attachments: input.attachments,
    inReplyTo: input.inReplyTo,
    references: input.references,
  });
  const sentFolder = await folderByType(db, tenantId, userId, role, account.id, EmailFolderType.SENT);
  const email = await db.email.create({
    data: {
      tenantId,
      accountId: account.id,
      folderId: sentFolder.id,
      messageId: sent.messageId,
      threadId: input.threadId?.trim() || null,
      direction: "OUTBOUND",
      isRead: true,
      readAt: new Date(),
      hasAttachments: input.attachments.length > 0,
      fromName: account.displayName,
      fromAddress: account.email,
      to: parseRecipientLine(input.to),
      cc: input.cc ? parseRecipientLine(input.cc) : undefined,
      bcc: input.bcc ? parseRecipientLine(input.bcc) : undefined,
      subject: input.subject,
      preview: previewFromText(text),
      textBody: text,
      htmlBody: input.html,
      sentAt: new Date(),
      receivedAt: new Date(),
    },
  });
  for (const a of input.attachments) {
    const attachmentId = newMailAttachmentId();
    const stored = await writeMailAttachmentBytes({
      tenantId,
      emailId: email.id,
      attachmentId,
      body: a.content,
      contentType: a.contentType,
    });
    await db.emailAttachment.create({
      data: {
        id: attachmentId,
        tenantId,
        emailId: email.id,
        fileName: a.filename,
        mimeType: a.contentType,
        size: a.content.length,
        diskRelPath: stored.diskRelPath,
        checksumSha256: stored.checksumSha256,
      },
    });
  }
  await refreshFolderCounters(db, tenantId, sentFolder.id);
  return { email, ...sent };
}

export type EmailReplyTemplateDto = {
  accountId: string;
  subjectTemplate: string;
  htmlTemplate: string;
  isEnabled: boolean;
};

export async function getEmailReplyTemplate(
  db: PrismaClient,
  tenantId: string,
  role: string,
  accountId: string,
): Promise<EmailReplyTemplateDto | null> {
  if (role !== UserRole.OWNER) throw new Error("MAIL_ACCOUNT_ACCESS_FORBIDDEN");
  const account = await db.emailAccount.findFirst({
    where: { id: accountId, tenantId },
    select: { id: true },
  });
  if (!account) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  const row = await db.emailReplyTemplate.findUnique({
    where: { accountId },
  });
  if (!row) return null;
  return {
    accountId: row.accountId,
    subjectTemplate: row.subjectTemplate,
    htmlTemplate: row.htmlTemplate,
    isEnabled: row.isEnabled,
  };
}

export async function upsertEmailReplyTemplate(
  db: PrismaClient,
  tenantId: string,
  role: string,
  accountId: string,
  input: {
    subjectTemplate: string;
    htmlTemplate: string;
    isEnabled: boolean;
  },
): Promise<EmailReplyTemplateDto> {
  if (role !== UserRole.OWNER) throw new Error("MAIL_ACCOUNT_ACCESS_FORBIDDEN");
  const account = await db.emailAccount.findFirst({
    where: { id: accountId, tenantId },
    select: { id: true },
  });
  if (!account) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  const row = await db.emailReplyTemplate.upsert({
    where: { accountId },
    create: {
      tenantId,
      accountId,
      subjectTemplate: input.subjectTemplate,
      htmlTemplate: input.htmlTemplate,
      isEnabled: input.isEnabled,
    },
    update: {
      subjectTemplate: input.subjectTemplate,
      htmlTemplate: input.htmlTemplate,
      isEnabled: input.isEnabled,
    },
  });
  return {
    accountId: row.accountId,
    subjectTemplate: row.subjectTemplate,
    htmlTemplate: row.htmlTemplate,
    isEnabled: row.isEnabled,
  };
}
