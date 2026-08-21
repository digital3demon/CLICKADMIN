import "server-only";
import {
  EmailDirection,
  EmailFolderType,
  EmailReplyTemplateAssetKind,
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
import { userCanManageMailAccountSettings } from "@/lib/auth/permissions";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import type { AppModule } from "@prisma/client";
import { encryptAppPassword } from "@/lib/mail/encryption";
import {
  deleteMessage,
  moveMessage,
  setMessageFlagged,
  testImapConnection,
} from "@/lib/mail/imap-client";
import { emailFolderListWhere } from "@/lib/mail/mail-folder-query";
import { mailSearchWhere } from "@/lib/mail/mail-search-query";
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
import { buildReplyTemplateContentId } from "@/lib/mail/reply-template-cid";
import type { ReplyEditorDocument, ReplyLayoutType } from "@/lib/mail/reply-block-editor";
import {
  createClickLabPreset,
  validateReplyEditorDocument,
  SAMPLE_ORDER_STATUS_URL,
} from "@/lib/mail/reply-block-editor";
import {
  buildHtmlFromReplyTemplate,
  normalizeEditorDocumentInput,
  resolveLayoutType,
} from "@/lib/mail/reply-template-render";
import { buildEmailReplyTemplateContext } from "@/lib/mail/build-email-reply-context";
import { syncEmailAccount, type MailSyncScope } from "@/lib/mail/mail-sync.service";

export type MailApiContext = {
  tenantId: string;
  userId: string;
  role: string;
  isDemo: boolean;
  db: PrismaClient;
  moduleAccess: Record<AppModule, boolean>;
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

function mailSettingsAccountWhere(tenantId: string, userId: string, role?: string) {
  const normalizedRole = normalizeUserRole(role || "");
  const roleOr: Array<{ allowedRoles: { has: UserRole } } | { settingsRoles: { has: UserRole } }> =
    [];
  if (normalizedRole) {
    roleOr.push({ allowedRoles: { has: normalizedRole } });
    roleOr.push({ settingsRoles: { has: normalizedRole } });
  }
  return {
    tenantId,
    isActive: true,
    OR: [{ createdByUserId: userId }, ...roleOr],
  };
}

export function mailAccountAccessWhere(tenantId: string, userId: string, role: string) {
  return userAccountWhere(tenantId, userId, role);
}

export function mailSettingsAccountAccessWhere(tenantId: string, userId: string, role: string) {
  return mailSettingsAccountWhere(tenantId, userId, role);
}

async function requireMailSettingsAccountVisible(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
  role?: string,
) {
  const account = await db.emailAccount.findFirst({
    where: { id: accountId, ...mailSettingsAccountWhere(tenantId, userId, role) },
  });
  if (!account) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  return account;
}

export async function assertMailSettingsManage(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): Promise<void> {
  const account = await requireMailSettingsAccountVisible(db, tenantId, userId, accountId, role);
  const access =
    moduleAccess ??
    (await getEffectiveModuleAccess(tenantId, role as UserRole));
  if (userCanManageMailAccountSettings(role, account.settingsRoles, access)) return;
  throw new Error("MAIL_SETTINGS_ACCESS_FORBIDDEN");
}

export async function hasMailSettingsPageAccess(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
): Promise<boolean> {
  if (role === UserRole.OWNER) return true;
  const normalizedRole = normalizeUserRole(role);
  if (!normalizedRole) return false;
  const count = await db.emailAccount.count({
    where: { tenantId, isActive: true, settingsRoles: { has: normalizedRole } },
  });
  return count > 0;
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
  if (!session?.sub || !tenantId) {
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
      isDemo: Boolean(session.demo),
      db: (await getOrdersPrisma()) as PrismaClient,
      moduleAccess: await getEffectiveModuleAccess(tenantId, session.role),
    },
  };
}

export function stringField(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export { previewFromText, textFromHtml, previewFromMailBody } from "@/lib/mail/mail-preview";

import { sanitizeMailHtml } from "@/lib/mail/sanitize-mail-html";
import { mergeEmailAttachmentsWithYandexDisk } from "@/lib/mail/yandex-disk-mail-attachments";

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
  settingsRoles: true,
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
  options: {
    lite?: boolean;
    tree?: boolean;
    forSettings?: boolean;
    moduleAccess?: Partial<Record<AppModule, boolean>> | null;
  } = {},
) {
  const accountWhere = options.forSettings
    ? mailSettingsAccountWhere(tenantId, userId, role)
    : userAccountWhere(tenantId, userId, role);
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
            settingsRoles: true,
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
      ...(options.forSettings
        ? {
            canManageSettings: userCanManageMailAccountSettings(
              role,
              safeAccount.settingsRoles as string[] | undefined,
              options.moduleAccess,
            ),
          }
        : {}),
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

function normalizeSettingsMailRoles(value: unknown): UserRole[] {
  const roles = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(roles.filter((role): role is UserRole => normalizeUserRole(String(role)) !== null)),
  );
}

export async function updateEmailAccountAccessRoles(
  db: PrismaClient,
  tenantId: string,
  role: string,
  accountId: string,
  allowedRolesInput: unknown,
  hoverPreviewEnabledInput?: unknown,
  settingsRolesInput?: unknown,
) {
  if (role !== UserRole.OWNER) throw new Error("MAIL_ACCOUNT_ACCESS_FORBIDDEN");
  const allowedRoles = normalizeAllowedMailRoles(allowedRolesInput);
  const settingsRoles =
    settingsRolesInput !== undefined ? normalizeSettingsMailRoles(settingsRolesInput) : undefined;
  const hoverPreviewEnabled =
    typeof hoverPreviewEnabledInput === "boolean" ? hoverPreviewEnabledInput : undefined;
  const updated = await db.emailAccount.updateMany({
    where: { id: accountId, tenantId },
    data: {
      allowedRoles,
      ...(hoverPreviewEnabled === undefined ? {} : { hoverPreviewEnabled }),
      ...(settingsRoles === undefined ? {} : { settingsRoles }),
    },
  });
  if (!updated.count) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  const account = await db.emailAccount.findFirst({
    where: { id: accountId, tenantId },
    select: { allowedRoles: true, settingsRoles: true, hoverPreviewEnabled: true },
  });
  if (!account) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  return {
    id: accountId,
    allowedRoles: account.allowedRoles,
    settingsRoles: account.settingsRoles,
    hoverPreviewEnabled: account.hoverPreviewEnabled,
  };
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
  await assertMailSettingsManage(db, tenantId, userId, role, accountId);
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
  await assertMailSettingsManage(db, tenantId, userId, role, accountId);
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
  const settingsWhere = mailSettingsAccountWhere(tenantId, userId, role);
  if (accountId) await requireMailSettingsAccountVisible(db, tenantId, userId, accountId, role);
  return db.emailRule.findMany({
    where: {
      tenantId,
      account: settingsWhere,
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
  await assertMailSettingsManage(db, tenantId, userId, role, input.accountId);
  const account = await requireMailSettingsAccountVisible(
    db,
    tenantId,
    userId,
    input.accountId,
    role,
  );
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
  const existing = await db.emailRule.findFirst({
    where: { id: ruleId, tenantId, account: mailSettingsAccountWhere(tenantId, userId, role) },
    select: { accountId: true },
  });
  if (!existing) throw new Error("EMAIL_RULE_NOT_FOUND");
  await assertMailSettingsManage(db, tenantId, userId, role, existing.accountId);
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
    where: { id: ruleId, tenantId, accountId: existing.accountId },
    data,
  });
  if (!updated.count) throw new Error("EMAIL_RULE_NOT_FOUND");
  return db.emailRule.findFirst({
    where: { id: ruleId, tenantId, accountId: existing.accountId },
  });
}

export async function deleteEmailRule(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  ruleId: string,
): Promise<void> {
  const existing = await db.emailRule.findFirst({
    where: { id: ruleId, tenantId, account: mailSettingsAccountWhere(tenantId, userId, role) },
    select: { accountId: true },
  });
  if (!existing) throw new Error("EMAIL_RULE_NOT_FOUND");
  await assertMailSettingsManage(db, tenantId, userId, role, existing.accountId);
  await db.emailRule.deleteMany({
    where: { id: ruleId, tenantId, accountId: existing.accountId },
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
  const searchWhere = mailSearchWhere(input.q);
  const andClauses: Prisma.EmailWhereInput[] = [];
  if (cursor) {
    andClauses.push({
      OR: [
        { receivedAt: { lt: new Date(cursor.r) } },
        { receivedAt: new Date(cursor.r), id: { lt: cursor.i } },
      ],
    });
  }
  if (searchWhere) andClauses.push(searchWhere);

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
      ...(andClauses.length ? { AND: andClauses } : {}),
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
    // Не трогаем \\Seen на IMAP — прочитанность только в CRM.
    if (email.folderId) {
      await refreshFolderCounters(db, tenantId, email.folderId).catch(() => undefined);
    }
    await Promise.all(
      email.labelAssignments.map((assignment) => refreshLabelCounters(db, tenantId, assignment.labelId).catch(() => undefined)),
    );
  }
  const sanitizedHtml = sanitizeMailHtml(email.htmlBody);
  const { encryptedAppPassword: _encryptedAppPassword, imapHost: _imapHost, imapPort: _imapPort, imapSecure: _imapSecure, ...safeAccount } = email.account;
  const attachments = mergeEmailAttachmentsWithYandexDisk(email.attachments, {
    textBody: email.textBody,
    htmlBody: email.htmlBody,
  }).map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    contentId: email.attachments.find((row) => row.id === attachment.id)?.contentId ?? null,
    isInline: email.attachments.find((row) => row.id === attachment.id)?.isInline ?? false,
    externalUrl: attachment.externalUrl ?? null,
  }));
  return {
    ...email,
    attachments,
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
        // isRead только в CRM — \\Seen на IMAP не меняем.
        continue;
      }
      if (!email.uid || !email.folder?.imapName) continue;
      await setMessageFlagged(email.account, email.folder.imapName, email.uid, input.action === "flag");
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
  layoutType: "blocks" | "freeform";
  editorVersion: number;
  editorDocument: ReplyEditorDocument | null;
  isEnabled: boolean;
};

function mapTemplateRow(row: {
  accountId: string;
  subjectTemplate: string;
  htmlTemplate: string;
  layoutType: string;
  editorVersion: number;
  editorDocument: unknown;
  isEnabled: boolean;
}): EmailReplyTemplateDto {
  const layoutType = resolveLayoutType(row.layoutType, row.htmlTemplate, row.editorDocument);
  const editorDocument =
    layoutType === "blocks"
      ? normalizeEditorDocumentInput("blocks", row.editorDocument)
      : null;
  return {
    accountId: row.accountId,
    subjectTemplate: row.subjectTemplate,
    htmlTemplate: row.htmlTemplate,
    layoutType,
    editorVersion: row.editorVersion,
    editorDocument,
    isEnabled: row.isEnabled,
  };
}

function previewContextForTemplateCache(): ReturnType<typeof buildEmailReplyTemplateContext> {
  return buildEmailReplyTemplateContext({
    orderNumber: "2606-285",
    patientName: "Иванова А. С.",
    doctorName: "Петров П. П.",
    clinicName: "Клиника «Альфа»",
    clinicAddress: "ул. Ленина, 1",
    date: "20.06.26",
    dueDate: "22.06.26, 14:00",
    appointmentDate: "25.06.26, 10:00",
    originalSubject: "Заказ",
    originalFromName: "Клиника",
    originalFromAddress: "clinic@example.com",
    orderStatusUrl: SAMPLE_ORDER_STATUS_URL,
  });
}

export async function getEmailReplyTemplate(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
): Promise<EmailReplyTemplateDto | null> {
  await requireMailSettingsAccountVisible(db, tenantId, userId, accountId, role);
  const row = await db.emailReplyTemplate.findUnique({
    where: { accountId },
  });
  if (!row) return null;
  return mapTemplateRow(row);
}

export async function upsertEmailReplyTemplate(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  input: {
    subjectTemplate: string;
    htmlTemplate?: string;
    layoutType?: ReplyLayoutType;
    editorDocument?: ReplyEditorDocument | null;
    editorVersion?: number;
    isEnabled?: boolean;
  },
): Promise<EmailReplyTemplateDto> {
  await assertMailSettingsManage(db, tenantId, userId, role, accountId);
  const account = await db.emailAccount.findFirst({
    where: { id: accountId, tenantId },
    select: { id: true },
  });
  if (!account) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  const existing = await db.emailReplyTemplate.findUnique({ where: { accountId } });
  const isEnabled =
    input.isEnabled !== undefined ? input.isEnabled : (existing?.isEnabled ?? true);
  const layoutType: ReplyLayoutType =
    input.layoutType ??
    (existing
      ? resolveLayoutType(existing.layoutType, existing.htmlTemplate, existing.editorDocument)
      : "blocks");
  let editorDocument: ReplyEditorDocument | null = null;
  let htmlTemplate = input.htmlTemplate ?? existing?.htmlTemplate ?? "";
  if (layoutType === "blocks") {
    editorDocument =
      input.editorDocument !== undefined
        ? input.editorDocument ?? createClickLabPreset()
        : normalizeEditorDocumentInput("blocks", existing?.editorDocument) ?? createClickLabPreset();
    const issues = validateReplyEditorDocument(editorDocument);
    if (issues.length > 0) {
      throw new Error(issues[0] ?? "INVALID_REPLY_EDITOR_DOCUMENT");
    }
    const assets = await db.emailReplyTemplateAsset.findMany({
      where: { tenantId, accountId },
      select: { id: true, contentId: true },
    });
    htmlTemplate = buildHtmlFromReplyTemplate(
      "blocks",
      "",
      editorDocument,
      previewContextForTemplateCache(),
      assets,
    );
  } else {
    htmlTemplate = stringField(input.htmlTemplate ?? existing?.htmlTemplate ?? "", 300_000);
    if (!htmlTemplate.trim()) {
      throw new Error("EMPTY_REPLY_HTML_TEMPLATE");
    }
  }
  const row = await db.emailReplyTemplate.upsert({
    where: { accountId },
    create: {
      tenantId,
      accountId,
      subjectTemplate: input.subjectTemplate,
      htmlTemplate,
      layoutType,
      editorVersion: input.editorVersion ?? 1,
      editorDocument: editorDocument ?? undefined,
      isEnabled,
    },
    update: {
      subjectTemplate: input.subjectTemplate,
      htmlTemplate,
      layoutType,
      editorVersion: input.editorVersion ?? 1,
      editorDocument: editorDocument ?? undefined,
      ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
    },
  });
  return mapTemplateRow(row);
}

export type EmailReplyTemplateAssetDto = {
  id: string;
  accountId: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: EmailReplyTemplateAssetKind;
  contentId: string;
  createdAt: string;
};

const REPLY_TEMPLATE_MAX_ASSETS = 20;
const REPLY_TEMPLATE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REPLY_TEMPLATE_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const REPLY_TEMPLATE_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const REPLY_TEMPLATE_ATTACHMENT_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function isAllowedReplyTemplateMime(mime: string, kind: EmailReplyTemplateAssetKind): boolean {
  const norm = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (kind === EmailReplyTemplateAssetKind.INLINE_IMAGE) {
    return REPLY_TEMPLATE_IMAGE_MIMES.has(norm);
  }
  return (
    REPLY_TEMPLATE_ATTACHMENT_MIMES.has(norm) ||
    norm.startsWith("application/vnd.")
  );
}

export async function listEmailReplyTemplateAssets(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
): Promise<EmailReplyTemplateAssetDto[]> {
  await requireMailSettingsAccountVisible(db, tenantId, userId, accountId, role);
  const rows = await db.emailReplyTemplateAsset.findMany({
    where: { tenantId, accountId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      accountId: true,
      fileName: true,
      mimeType: true,
      size: true,
      kind: true,
      contentId: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getEmailReplyTemplateAssetBytes(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  assetId: string,
): Promise<{ mimeType: string; fileName: string; data: Buffer }> {
  await requireMailSettingsAccountVisible(db, tenantId, userId, accountId, role);
  const row = await db.emailReplyTemplateAsset.findFirst({
    where: { id: assetId, tenantId, accountId },
    select: { mimeType: true, fileName: true, data: true },
  });
  if (!row) throw new Error("EMAIL_REPLY_TEMPLATE_ASSET_NOT_FOUND");
  return {
    mimeType: row.mimeType,
    fileName: row.fileName,
    data: Buffer.from(row.data),
  };
}

export async function createEmailReplyTemplateAsset(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  input: { fileName: string; mimeType: string; data: Buffer },
): Promise<EmailReplyTemplateAssetDto> {
  await assertMailSettingsManage(db, tenantId, userId, role, accountId);
  const count = await db.emailReplyTemplateAsset.count({
    where: { tenantId, accountId },
  });
  if (count >= REPLY_TEMPLATE_MAX_ASSETS) {
    throw new Error("EMAIL_REPLY_TEMPLATE_ASSET_LIMIT");
  }

  const mimeType = input.mimeType.toLowerCase().split(";")[0]?.trim() || "application/octet-stream";
  const kind = REPLY_TEMPLATE_IMAGE_MIMES.has(mimeType)
    ? EmailReplyTemplateAssetKind.INLINE_IMAGE
    : EmailReplyTemplateAssetKind.ATTACHMENT;
  if (!isAllowedReplyTemplateMime(mimeType, kind)) {
    throw new Error("EMAIL_REPLY_TEMPLATE_ASSET_TYPE_FORBIDDEN");
  }
  const maxBytes =
    kind === EmailReplyTemplateAssetKind.INLINE_IMAGE
      ? REPLY_TEMPLATE_MAX_IMAGE_BYTES
      : REPLY_TEMPLATE_MAX_ATTACHMENT_BYTES;
  if (input.data.length > maxBytes) {
    throw new Error("EMAIL_REPLY_TEMPLATE_ASSET_TOO_LARGE");
  }

  const fileName = input.fileName.trim().slice(0, 255) || "file";
  const row = await db.emailReplyTemplateAsset.create({
    data: {
      tenantId,
      accountId,
      fileName,
      mimeType,
      size: input.data.length,
      data: new Uint8Array(input.data),
      kind,
      contentId: "",
    },
  });
  const contentId = buildReplyTemplateContentId(row.id);
  const updated = await db.emailReplyTemplateAsset.update({
    where: { id: row.id },
    data: { contentId },
    select: {
      id: true,
      accountId: true,
      fileName: true,
      mimeType: true,
      size: true,
      kind: true,
      contentId: true,
      createdAt: true,
    },
  });
  return { ...updated, createdAt: updated.createdAt.toISOString() };
}

export async function deleteEmailReplyTemplateAsset(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  assetId: string,
): Promise<void> {
  await assertMailSettingsManage(db, tenantId, userId, role, accountId);
  const row = await db.emailReplyTemplateAsset.findFirst({
    where: { id: assetId, tenantId, accountId },
    select: { id: true },
  });
  if (!row) throw new Error("EMAIL_REPLY_TEMPLATE_ASSET_NOT_FOUND");
  await db.emailReplyTemplateAsset.delete({ where: { id: assetId } });
}

export async function listEmailReplyTemplateAssetsForSend(
  db: PrismaClient,
  tenantId: string,
  accountId: string,
) {
  return db.emailReplyTemplateAsset.findMany({
    where: { tenantId, accountId },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      kind: true,
      contentId: true,
      data: true,
    },
  });
}
