import "server-only";
import { EmailFolderType, type EmailAccount, type EmailSyncMode, type PrismaClient } from "@prisma/client";
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
  testImapConnection,
} from "@/lib/mail/imap-client";
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
import { sendSmtpMessage, type MailSendAttachment } from "@/lib/mail/smtp-client";
import { syncEmailAccount } from "@/lib/mail/mail-sync.service";

export type MailApiContext = {
  tenantId: string;
  userId: string;
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

function userAccountWhere(tenantId: string, userId: string) {
  return { tenantId, createdByUserId: userId };
}

async function requireUserEmailAccount(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
) {
  const account = await db.emailAccount.findFirst({
    where: { id: accountId, ...userAccountWhere(tenantId, userId) },
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
      db: (await getOrdersPrisma()) as PrismaClient,
    },
  };
}

export function stringField(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function previewFromText(text: string, max = 320): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

export function textFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeMailHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\s(href|src)\s*=\s*["']javascript:[^"']*["']/gi, "");
}

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
  accountId: string,
  type: EmailFolderType,
) {
  await requireUserEmailAccount(db, tenantId, userId, accountId);
  const existing = await db.emailFolder.findFirst({
    where: { tenantId, accountId, type, account: { createdByUserId: userId } },
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
  const [totalCount, unreadCount] = await Promise.all([
    db.email.count({ where: { tenantId, folderId } }),
    db.email.count({ where: { tenantId, folderId, isRead: false } }),
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

export async function listEmailAccounts(db: PrismaClient, tenantId: string, userId: string) {
  const accounts = await db.emailAccount.findMany({
    where: userAccountWhere(tenantId, userId),
    orderBy: [{ isActive: "desc" }, { email: "asc" }],
    include: {
      folders: { orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }] },
      labels: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      _count: { select: { emails: true } },
    },
  });
  return accounts.map(({ encryptedAppPassword, ...account }) => ({
    ...account,
    hasPassword: Boolean(encryptedAppPassword),
  }));
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
      ...(input.appPassword
        ? {
            encryptedAppPassword: encryptAppPassword(input.appPassword),
            passwordUpdatedAt: new Date(),
          }
        : {}),
    },
  });
  await ensureSystemFolders(db, tenantId, account.id);
  return account;
}

export async function deleteEmailAccount(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
): Promise<void> {
  const attachments = await db.emailAttachment.findMany({
    where: {
      tenantId,
      email: {
        accountId,
        account: { createdByUserId: userId },
      },
    },
    select: { diskRelPath: true },
  });
  await db.emailAccount.deleteMany({
    where: { id: accountId, ...userAccountWhere(tenantId, userId) },
  });
  await Promise.all(attachments.map((a) => deleteMailAttachmentBytes(a.diskRelPath)));
}

export async function testEmailAccountConnection(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
): Promise<void> {
  const account = await requireUserEmailAccount(db, tenantId, userId, accountId);
  await testImapConnection(account);
}

export async function syncAccountNow(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
  options: { mode?: EmailSyncMode } = {},
) {
  const account = await requireUserEmailAccount(db, tenantId, userId, accountId);
  await ensureSystemFolders(db, tenantId, account.id);
  return syncEmailAccount(db, account, options);
}

export async function listEmailFolders(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
) {
  await requireUserEmailAccount(db, tenantId, userId, accountId);
  await ensureSystemFolders(db, tenantId, accountId);
  return db.emailFolder.findMany({
    where: { tenantId, accountId },
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
  });
}

export async function createEmailFolder(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
  displayName: string,
  color = "#6b7280",
) {
  await requireUserEmailAccount(db, tenantId, userId, accountId);
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
  accountId: string,
) {
  await requireUserEmailAccount(db, tenantId, userId, accountId);
  return db.emailLabel.findMany({
    where: { tenantId, accountId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createEmailLabel(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
  input: { name: string; color: string },
) {
  await requireUserEmailAccount(db, tenantId, userId, accountId);
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
  accountId?: string | null,
) {
  if (accountId) await requireUserEmailAccount(db, tenantId, userId, accountId);
  return db.emailRule.findMany({
    where: {
      tenantId,
      account: { createdByUserId: userId },
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
  input: {
    accountId: string;
    name: string;
    conditions: unknown;
    actions: unknown;
  },
) {
  const account = await requireUserEmailAccount(db, tenantId, userId, input.accountId);
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
    where: { id: ruleId, tenantId, account: { createdByUserId: userId } },
    data,
  });
  if (!updated.count) throw new Error("EMAIL_RULE_NOT_FOUND");
  return db.emailRule.findFirst({
    where: { id: ruleId, tenantId, account: { createdByUserId: userId } },
  });
}

export async function deleteEmailRule(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  ruleId: string,
): Promise<void> {
  await db.emailRule.deleteMany({
    where: { id: ruleId, tenantId, account: { createdByUserId: userId } },
  });
}

export async function listEmails(
  db: PrismaClient,
  tenantId: string,
  userId: string,
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
  await requireUserEmailAccount(db, tenantId, userId, input.accountId);
  const take = clampMailPageSize(input.take);
  const cursor = decodeMailListCursor(input.cursor);
  const rows = await db.email.findMany({
    where: {
      tenantId,
      accountId: input.accountId,
      ...(input.folderId ? { folderId: input.folderId } : {}),
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
                OR: cursor.f
                  ? [
                      { isFlagged: false },
                      { isFlagged: true, receivedAt: { lt: new Date(cursor.r) } },
                      { isFlagged: true, receivedAt: new Date(cursor.r), id: { lt: cursor.i } },
                    ]
                  : [
                      { isFlagged: false, receivedAt: { lt: new Date(cursor.r) } },
                      { isFlagged: false, receivedAt: new Date(cursor.r), id: { lt: cursor.i } },
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
    orderBy: [{ isFlagged: "desc" }, { receivedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    include: {
      folder: true,
      labelAssignments: { include: { label: true } },
      _count: { select: { attachments: true } },
    },
  });
  const emails = rows.slice(0, take);
  const last = emails.at(-1);
  return {
    emails,
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
  emailId: string,
  markRead = true,
) {
  const email = await db.email.findFirst({
    where: { id: emailId, tenantId, account: { createdByUserId: userId } },
    include: {
      account: { select: { id: true, email: true, displayName: true } },
      folder: true,
      attachments: {
        select: { id: true, fileName: true, mimeType: true, size: true, contentId: true, isInline: true },
      },
      labelAssignments: { include: { label: true } },
    },
  });
  if (!email) throw new Error("EMAIL_NOT_FOUND");
  if (markRead && !email.isRead) {
    await db.email.update({
      where: { id: email.id },
      data: { isRead: true, readAt: new Date() },
    });
    if (email.folderId) {
      await db.emailFolder.updateMany({
        where: { id: email.folderId, unreadCount: { gt: 0 } },
        data: { unreadCount: { decrement: 1 } },
      }).catch(() => undefined);
    }
  }
  const sanitizedHtml = sanitizeMailHtml(email.htmlBody);
  return {
    ...email,
    safeHtmlBody: inlineCidImages(sanitizedHtml, email.id, email.attachments),
  };
}

export async function getEmailAttachment(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  emailId: string,
  attachmentId: string,
) {
  const attachment = await db.emailAttachment.findFirst({
    where: {
      id: attachmentId,
      emailId,
      tenantId,
      email: { account: { createdByUserId: userId } },
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
  input: {
    ids: string[];
    action: "read" | "unread" | "flag" | "unflag" | "archive" | "trash" | "delete" | "move";
    accountId?: string | null;
    targetFolderId?: string | null;
  },
) {
  const ids = input.ids.filter(Boolean).slice(0, 500);
  if (!ids.length) return { updated: 0 };
  const before = await db.email.findMany({
    where: { tenantId, id: { in: ids }, account: { createdByUserId: userId } },
    include: {
      account: true,
      folder: true,
    },
  });

  let updated = 0;
  if (input.action === "delete") {
    const attachments = await db.emailAttachment.findMany({
      where: {
        tenantId,
        emailId: { in: ids },
        email: { account: { createdByUserId: userId } },
      },
      select: { diskRelPath: true },
    });
    for (const email of before) {
      if (email.uid && email.folder?.imapName) {
        await deleteMessage(email.account, email.folder.imapName, email.uid);
      }
    }
    const res = await db.email.deleteMany({
      where: { tenantId, id: { in: ids }, account: { createdByUserId: userId } },
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
              account: { createdByUserId: userId },
            },
          })
        : await folderByType(
            db,
            tenantId,
            userId,
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
        where: { tenantId, id: email.id, account: { createdByUserId: userId } },
        data: { folderId: target.id, ...(movedUid ? { uid: movedUid } : {}) },
      });
      updated += res.count;
    }
  } else {
    for (const email of before) {
      if (!email.uid || !email.folder?.imapName) continue;
      if (input.action === "read" || input.action === "unread") {
        await setMessageSeen(email.account, email.folder.imapName, email.uid, input.action === "read");
      } else {
        await setMessageFlagged(email.account, email.folder.imapName, email.uid, input.action === "flag");
      }
    }
    const res = await db.email.updateMany({
      where: { tenantId, id: { in: ids }, account: { createdByUserId: userId } },
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
  const after = await db.email.findMany({
    where: { tenantId, id: { in: ids }, account: { createdByUserId: userId } },
    select: { folderId: true },
  });
  for (const folderId of after.map((e) => e.folderId)) {
    if (folderId) folders.add(folderId);
  }
  await Promise.all([...folders].map((folderId) => refreshFolderCounters(db, tenantId, folderId)));
  return { updated };
}

export async function sendEmail(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  input: {
    accountId: string;
    to: string;
    cc?: string | null;
    bcc?: string | null;
    subject: string;
    html: string;
    attachments: MailSendAttachment[];
  },
) {
  const account = await requireUserEmailAccount(db, tenantId, userId, input.accountId);
  const text = textFromHtml(input.html);
  const sent = await sendSmtpMessage(account, {
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    html: input.html,
    text,
    attachments: input.attachments,
  });
  const sentFolder = await folderByType(db, tenantId, userId, account.id, EmailFolderType.SENT);
  const email = await db.email.create({
    data: {
      tenantId,
      accountId: account.id,
      folderId: sentFolder.id,
      messageId: sent.messageId,
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
