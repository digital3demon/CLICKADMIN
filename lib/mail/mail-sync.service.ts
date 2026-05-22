import "server-only";
import { randomUUID } from "node:crypto";
import {
  EmailFolderType,
  EmailSyncMode,
  type EmailAccount,
  type EmailRule,
  type PrismaClient,
} from "@prisma/client";
import { simpleParser, type ParsedMail } from "mailparser";
import { logger } from "@/lib/server/logger";
import {
  createImapClient,
  fetchFolderMessagesBefore,
  fetchFolderMessages,
  fetchFolderMessagesSince,
  listImapFolders,
  setMessageSeen,
  type ImapFetchedMessage,
  type ImapFolderInfo,
} from "@/lib/mail/imap-client";
import {
  deleteMailAttachmentBytes,
  newMailAttachmentId,
  writeMailAttachmentBytes,
} from "@/lib/mail/mail-attachment-storage";
import { ensureOrderDigitaldemonRules } from "@/lib/mail/order-digitaldemon-rules";
import { sendSmtpMessage } from "@/lib/mail/smtp-client";

const RECENT_MESSAGES_PER_FOLDER = 250;
const BACKFILL_MESSAGES_PER_FOLDER = 120;
const RECENT_SYNC_LOOKBACK_DAYS = 4;

type SyncCursorMode = "forward" | "backfill" | "lookback";
type SyncFetchedMessage = {
  item: ImapFetchedMessage;
  cursorMode: SyncCursorMode;
};

function normalizeFolderPath(value: string): string {
  return value.trim().toLowerCase();
}

export function inferFolderType(path: string): EmailFolderType {
  const p = normalizeFolderPath(path);
  if (p === "inbox" || p === "входящие") return EmailFolderType.INBOX;
  if (p.includes("sent") || p.includes("отправ")) return EmailFolderType.SENT;
  if (p.includes("draft") || p.includes("чернов")) return EmailFolderType.DRAFTS;
  if (p.includes("spam") || p.includes("спам")) return EmailFolderType.SPAM;
  if (p.includes("trash") || p.includes("deleted") || p.includes("корз")) {
    return EmailFolderType.TRASH;
  }
  if (p.includes("archive") || p.includes("архив")) return EmailFolderType.ARCHIVE;
  return EmailFolderType.CUSTOM;
}

export function shouldSyncFolderForMode(type: EmailFolderType, mode: EmailSyncMode): boolean {
  if (mode === EmailSyncMode.BACKFILL) return true;
  return type === EmailFolderType.INBOX || type === EmailFolderType.SENT || type === EmailFolderType.CUSTOM;
}

function recentSyncSinceDate(now = new Date()): Date {
  return new Date(now.getTime() - RECENT_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
}

async function* fetchRecentFolderMessages(
  client: Parameters<typeof fetchFolderMessages>[0],
  folderPath: string,
  startUid: number,
  maxMessages: number,
): AsyncGenerator<SyncFetchedMessage> {
  // Date search catches today's mail even if the saved UID cursor/window is stale.
  // It must not move lastSyncedUid, because that would skip unprocessed UID gaps.
  for await (const item of fetchFolderMessagesSince(client, folderPath, recentSyncSinceDate(), maxMessages)) {
    yield { item, cursorMode: "lookback" };
  }
  for await (const item of fetchFolderMessages(client, folderPath, startUid, maxMessages)) {
    yield { item, cursorMode: "forward" };
  }
}

async function* markCursorMode(
  messages: AsyncGenerator<ImapFetchedMessage>,
  cursorMode: SyncCursorMode,
): AsyncGenerator<SyncFetchedMessage> {
  for await (const item of messages) {
    yield { item, cursorMode };
  }
}

function folderSyncPriority(folder: ImapFolderInfo): number {
  const type = inferFolderType(folder.path);
  if (type === EmailFolderType.INBOX) return 0;
  if (type === EmailFolderType.SENT) return 10;
  if (type === EmailFolderType.CUSTOM) return 20;
  if (type === EmailFolderType.ARCHIVE) return 40;
  if (type === EmailFolderType.SPAM || type === EmailFolderType.TRASH) return 80;
  return 60;
}

function addressList(value: ParsedMail["from"] | ParsedMail["to"] | ParsedMail["cc"]): Array<{
  name: string | null;
  address: string;
}> {
  if (!value) return [];
  const all = Array.isArray(value) ? value.flatMap((v) => v.value) : value.value;
  return all
    .map((item) => ({
      name: item.name?.trim() || null,
      address: item.address?.trim() || "",
    }))
    .filter((item) => item.address);
}

function firstAddress(value: ParsedMail["from"]): { name: string | null; address: string | null } {
  const [first] = addressList(value);
  return {
    name: first?.name ?? null,
    address: first?.address ?? null,
  };
}

export function previewFrom(text: string | undefined): string | null {
  const normalized = (text ?? "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\((?:https?:\/\/|cid:)[^)]*\)/gi, "$1")
    .replace(/\[(?:https?:\/\/|cid:)[^\]]+]/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    // JS \b не считает кириллицу word-символами, поэтому границы задаём через \p{L}.
    .replace(/(?<!\p{L})(?:логотип|logo)(?!\p{L})/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.slice(0, 320) : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function syncErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Ошибка синхронизации";
  const details = err as Error & { code?: unknown; responseText?: unknown };
  const code = typeof details.code === "string" ? details.code : "";
  if (code === "ETIMEOUT" || code === "ETIMEDOUT" || err.message.toLowerCase().includes("socket timeout")) {
    return "Почтовый сервер не ответил вовремя. Синхронизация повторится автоматически.";
  }
  if (err.message === "Command failed" && typeof details.responseText === "string" && details.responseText.trim()) {
    return `IMAP-команда отклонена сервером: ${details.responseText.trim()}`;
  }
  return err.message || "Ошибка синхронизации";
}

function headersToJson(headers: ParsedMail["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    out[key] = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  }
  return out;
}

async function parseMailForSync(item: ImapFetchedMessage): Promise<ParsedMail | null> {
  try {
    return await simpleParser(item.source);
  } catch (err) {
    logger.error({ err, uid: item.uid }, "mail message parse failed");
    return null;
  }
}

export type MailRuleConditionField = "from" | "toCc" | "subject" | "body" | "attachmentName";

export type MailRuleCondition = {
  field: MailRuleConditionField;
  contains: string;
};

export type MailRuleMessage = {
  from: string;
  toCc: string;
  subject: string;
  body: string;
  attachmentNames: string[];
};

export type MailRuleApplyResult = {
  isFlagged: boolean;
  isRead: boolean;
  shouldDelete: boolean;
  stopProcessing: boolean;
  labelIds: string[];
  folderId: string | null;
  forwardTo: string[];
};

function stringFromJsonField(value: unknown, key: string): string {
  if (!value || typeof value !== "object") return "";
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function stringArrayFromJsonField(value: unknown, key: string): string[] {
  if (!value || typeof value !== "object") return [];
  const raw = (value as Record<string, unknown>)[key];
  return Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizedContains(haystack: string, needle: string): boolean {
  const value = needle.trim().toLowerCase();
  return Boolean(value) && haystack.toLowerCase().includes(value);
}

function normalizeRuleField(value: unknown): MailRuleConditionField | null {
  return value === "from" ||
    value === "toCc" ||
    value === "subject" ||
    value === "body" ||
    value === "attachmentName"
    ? value
    : null;
}

export function getRuleConditions(conditions: unknown): MailRuleCondition[] {
  if (!conditions || typeof conditions !== "object") return [];
  const record = conditions as Record<string, unknown>;
  if (Array.isArray(record.any)) {
    return record.any
      .map((item): MailRuleCondition | null => {
        if (!item || typeof item !== "object") return null;
        const source = item as Record<string, unknown>;
        const field = normalizeRuleField(source.field);
        const contains = typeof source.contains === "string" ? source.contains.trim() : "";
        return field && contains ? { field, contains } : null;
      })
      .filter((item): item is MailRuleCondition => Boolean(item));
  }

  return (["from", "subject", "body"] as const)
    .map((field): MailRuleCondition | null => {
      const contains = stringFromJsonField(conditions, field);
      return contains ? { field, contains } : null;
    })
    .filter((item): item is MailRuleCondition => Boolean(item));
}

function booleanFromJsonField(value: unknown, key: string): boolean {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>)[key] === true);
}

function nullableStringFromJsonField(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function ruleMatches(
  rule: Pick<EmailRule, "conditions">,
  message: MailRuleMessage,
): boolean {
  const conditions = getRuleConditions(rule.conditions);
  if (conditions.length === 0) return false;

  const values: Record<MailRuleConditionField, string> = {
    from: message.from,
    toCc: message.toCc,
    subject: message.subject,
    body: message.body,
    attachmentName: message.attachmentNames.join(" "),
  };
  return conditions.some((condition) => normalizedContains(values[condition.field], condition.contains));
}

export function evaluateIncomingRules(
  rules: Array<Pick<EmailRule, "conditions" | "actions">>,
  message: MailRuleMessage,
): MailRuleApplyResult {
  let isFlagged = false;
  let isRead = false;
  let shouldDelete = false;
  let stopProcessing = false;
  const labelIds = new Set<string>();
  const forwardTo = new Set<string>();
  let folderId: string | null = null;

  for (const rule of rules) {
    if (!ruleMatches(rule, message)) continue;
    const actions = rule.actions;
    isFlagged ||= booleanFromJsonField(actions, "markImportant");
    isRead ||= booleanFromJsonField(actions, "markRead");
    shouldDelete ||= booleanFromJsonField(actions, "delete");
    stopProcessing ||= booleanFromJsonField(actions, "stopProcessing");
    for (const labelId of stringArrayFromJsonField(actions, "labelIds")) {
      labelIds.add(labelId);
    }
    for (const recipient of stringArrayFromJsonField(actions, "forwardTo")) {
      forwardTo.add(recipient);
    }
    folderId = nullableStringFromJsonField(actions, "moveToFolderId") ?? folderId;
    if (stopProcessing) break;
  }

  return {
    isFlagged,
    isRead,
    shouldDelete,
    stopProcessing,
    labelIds: [...labelIds],
    folderId,
    forwardTo: [...forwardTo],
  };
}

export async function validateRuleResult(
  db: PrismaClient,
  account: Pick<EmailAccount, "id" | "tenantId">,
  result: MailRuleApplyResult,
): Promise<MailRuleApplyResult> {
  const labelIds = new Set(result.labelIds);
  let folderId = result.folderId;
  let firstLabelForFolder: { name: string; color: string } | null = null;

  if (labelIds.size > 0) {
    const existing = await db.emailLabel.findMany({
      where: { tenantId: account.tenantId, accountId: account.id, id: { in: [...labelIds] } },
      select: { id: true, name: true, color: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    labelIds.clear();
    existing.forEach((label) => labelIds.add(label.id));
    firstLabelForFolder = existing[0] ? { name: existing[0].name, color: existing[0].color } : null;
  }

  if (folderId) {
    const folder = await db.emailFolder.findFirst({
      where: { tenantId: account.tenantId, accountId: account.id, id: folderId },
      select: { id: true },
    });
    folderId = folder?.id ?? null;
  }

  if (firstLabelForFolder && !result.shouldDelete) {
    folderId = await ensureFolderForLabel(db, account, firstLabelForFolder);
  }

  if (result.shouldDelete) {
    const trashFolder = await db.emailFolder.findFirst({
      where: { tenantId: account.tenantId, accountId: account.id, type: EmailFolderType.TRASH },
      select: { id: true },
    });
    folderId = trashFolder?.id ?? folderId;
  }

  return { ...result, labelIds: [...labelIds], folderId };
}

async function applyIncomingRules(
  db: PrismaClient,
  account: Pick<EmailAccount, "id" | "tenantId">,
  rules: EmailRule[],
  message: MailRuleMessage,
): Promise<MailRuleApplyResult> {
  return validateRuleResult(db, account, evaluateIncomingRules(rules, message));
}

function mailRuleMessageFromParsed(parsed: ParsedMail): MailRuleMessage {
  const from = firstAddress(parsed.from);
  const recipients = [...addressList(parsed.to), ...addressList(parsed.cc)];
  return {
    from: [from.name, from.address].filter(Boolean).join(" "),
    toCc: recipients.map((item) => [item.name, item.address].filter(Boolean).join(" ")).join(" "),
    subject: parsed.subject ?? "",
    body: parsed.text ?? "",
    attachmentNames: parsed.attachments.map((attachment) => attachment.filename || "attachment"),
  };
}

async function forwardIncomingMessage(
  account: EmailAccount,
  recipients: string[],
  parsed: ParsedMail,
): Promise<void> {
  if (recipients.length === 0) return;
  const body = typeof parsed.html === "string" ? parsed.html : parsed.text ?? "";
  await sendSmtpMessage(account, {
    to: recipients.join(", "),
    subject: parsed.subject ? `Fwd: ${parsed.subject}` : "Fwd: письмо",
    html: typeof body === "string" ? body : "",
    text: parsed.text ?? "",
    attachments: parsed.attachments.map((attachment) => ({
      filename: attachment.filename || "attachment",
      contentType: attachment.contentType || "application/octet-stream",
      content: attachment.content,
    })),
  });
}

async function upsertFolder(
  db: PrismaClient,
  account: Pick<EmailAccount, "id" | "tenantId">,
  folder: ImapFolderInfo,
) {
  const type = inferFolderType(folder.path);
  return db.emailFolder.upsert({
    where: { accountId_imapName: { accountId: account.id, imapName: folder.path } },
    create: {
      tenantId: account.tenantId,
      accountId: account.id,
      imapName: folder.path,
      displayName: folder.name || folder.path,
      delimiter: folder.delimiter,
      type,
      sortOrder:
        type === EmailFolderType.INBOX
          ? 10
          : type === EmailFolderType.SENT
            ? 20
            : type === EmailFolderType.DRAFTS
              ? 30
              : type === EmailFolderType.ARCHIVE
                ? 40
                : type === EmailFolderType.SPAM
                  ? 50
                  : type === EmailFolderType.TRASH
                    ? 60
                    : 100,
    },
    update: {
      displayName: folder.name || folder.path,
      delimiter: folder.delimiter,
      type,
    },
  });
}

async function refreshFolderCounters(
  db: PrismaClient,
  tenantId: string,
  folderId: string,
): Promise<void> {
  const [totalCount, unreadCount] = await Promise.all([
    db.email.count({ where: { tenantId, folderId } }),
    db.email.count({ where: { tenantId, folderId, isRead: false } }),
  ]);
  await db.emailFolder.update({
    where: { id: folderId },
    data: { totalCount, unreadCount },
  });
}

async function refreshLabelCounters(
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

async function applyExplicitRuleSeenOnServer(
  account: EmailAccount,
  folder: { imapName: string },
  item: ImapFetchedMessage,
  shouldMarkRead: boolean,
): Promise<void> {
  if (!shouldMarkRead || item.flags.has("\\Seen")) return;
  try {
    await setMessageSeen(account, folder.imapName, item.uid, true);
    item.flags.add("\\Seen");
  } catch (err) {
    logger.warn(
      { err, accountId: account.id, folder: folder.imapName, uid: item.uid },
      "mail rule markRead could not update IMAP seen flag",
    );
  }
}

async function ensureFolderForLabel(
  db: PrismaClient,
  account: Pick<EmailAccount, "id" | "tenantId">,
  label: { name: string; color: string },
): Promise<string | null> {
  const name = label.name.trim();
  if (!name) return null;
  const existing = await db.emailFolder.findFirst({
    where: {
      tenantId: account.tenantId,
      accountId: account.id,
      OR: [
        { displayName: { equals: name, mode: "insensitive" } },
        { imapName: { equals: name, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.emailFolder.create({
    data: {
      tenantId: account.tenantId,
      accountId: account.id,
      imapName: name,
      displayName: name,
      color: label.color,
      type: EmailFolderType.CUSTOM,
      sortOrder: 200,
    },
    select: { id: true },
  });
  return created.id;
}

export async function syncEmailAccount(
  db: PrismaClient,
  account: EmailAccount,
  options: { mode?: EmailSyncMode } = {},
): Promise<{ imported: number; skipped: number; folders: number }> {
  const startedAt = Date.now();
  const mode = options.mode ?? EmailSyncMode.RECENT;
  const client = createImapClient(account);
  let imported = 0;
  let skipped = 0;
  let folders = 0;
  let folderErrors = 0;

  await ensureOrderDigitaldemonRules(db, account).catch((err) =>
    logger.error({ err, accountId: account.id }, "order mail rules ensure failed"),
  );
  await client.connect();
  try {
    const activeRules = await db.emailRule.findMany({
      where: { tenantId: account.tenantId, accountId: account.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const listedFolders = (await listImapFolders(client)).sort(
      (a, b) => folderSyncPriority(a) - folderSyncPriority(b) || a.path.localeCompare(b.path),
    );
    for (const listed of listedFolders) {
      try {
      const folder = await upsertFolder(db, account, listed);
      folders += 1;
      if (!shouldSyncFolderForMode(folder.type, mode)) continue;
      let maxUid = folder.lastSyncedUid ?? 0;
      let minBackfillUid = folder.lastBackfillUid ?? null;
      let processed = 0;
      const touchedFolderIds = new Set<string>([folder.id]);
      const touchedLabelIds = new Set<string>();
      const maxMessages =
        mode === EmailSyncMode.BACKFILL
          ? BACKFILL_MESSAGES_PER_FOLDER
          : RECENT_MESSAGES_PER_FOLDER;
      const messages =
        mode === EmailSyncMode.BACKFILL
          ? markCursorMode(
              fetchFolderMessagesBefore(client, listed.path, folder.lastBackfillUid, maxMessages),
              "backfill",
            )
          : fetchRecentFolderMessages(client, listed.path, maxUid + 1, maxMessages);
      for await (const { item, cursorMode } of messages) {
        if (processed >= maxMessages * 2) break;
        processed += 1;
        if (cursorMode === "forward") maxUid = Math.max(maxUid, item.uid);
        if (cursorMode === "backfill") {
          minBackfillUid = minBackfillUid == null ? item.uid : Math.min(minBackfillUid, item.uid);
        }

        const exists = await db.email.findFirst({
          where: {
            tenantId: account.tenantId,
            accountId: account.id,
            folderId: folder.id,
            uid: item.uid,
          },
          select: {
            id: true,
            isRead: true,
            isFlagged: true,
            labelAssignments: { select: { labelId: true } },
          },
        });
        if (exists) {
          const seenOnServer = item.flags.has("\\Seen");
          const flaggedOnServer = item.flags.has("\\Flagged");
          const data: Record<string, unknown> = {};
          if (exists.isRead !== seenOnServer) {
            data.isRead = seenOnServer;
            data.readAt = seenOnServer ? item.internalDate ?? new Date() : null;
          }
          if (exists.isFlagged !== flaggedOnServer) {
            data.isFlagged = flaggedOnServer;
          }
          if (Object.keys(data).length > 0) {
            await db.email.update({ where: { id: exists.id }, data });
            for (const assignment of exists.labelAssignments) touchedLabelIds.add(assignment.labelId);
          }
          skipped += 1;
          continue;
        }

        const parsed = await parseMailForSync(item);
        if (!parsed) {
          try {
            await db.email.create({
              data: {
                id: randomUUID(),
                tenantId: account.tenantId,
                accountId: account.id,
                folderId: folder.id,
                uid: item.uid,
                direction: folder.type === EmailFolderType.SENT ? "OUTBOUND" : "INBOUND",
                isRead: item.flags.has("\\Seen"),
                readAt: item.flags.has("\\Seen") ? item.internalDate ?? new Date() : null,
                isFlagged: item.flags.has("\\Flagged"),
                hasAttachments: false,
                subject: "(письмо загружено без разбора)",
                preview: "CRM получила письмо, но не смогла разобрать MIME-содержимое. Оригинал остаётся в Яндекс.Почте.",
                receivedAt: item.internalDate ?? new Date(),
                internalDate: item.internalDate,
              },
            });
            imported += 1;
          } catch (error) {
            if (!isUniqueConstraintError(error)) throw error;
            skipped += 1;
          }
          continue;
        }
        const from = firstAddress(parsed.from);
        const hasAttachments = parsed.attachments.length > 0;
        const ruleResult =
          folder.type === EmailFolderType.INBOX
            ? await applyIncomingRules(db, account, activeRules, mailRuleMessageFromParsed(parsed))
            : {
                isFlagged: false,
                isRead: false,
                shouldDelete: false,
                stopProcessing: false,
                labelIds: [],
                folderId: null,
                forwardTo: [],
              };
        const targetFolderId = ruleResult.folderId ?? folder.id;
        await applyExplicitRuleSeenOnServer(account, folder, item, ruleResult.isRead);
        const isRead = item.flags.has("\\Seen") || ruleResult.isRead;
        const duplicateByMessageId = parsed.messageId
          ? await db.email.findFirst({
              where: {
                tenantId: account.tenantId,
                accountId: account.id,
                messageId: parsed.messageId,
              },
              select: {
                id: true,
                folderId: true,
                uid: true,
                isRead: true,
                isFlagged: true,
                labelAssignments: { select: { labelId: true } },
              },
            })
          : null;
        if (duplicateByMessageId) {
          const duplicateData: Record<string, unknown> = {};
          if (duplicateByMessageId.folderId !== targetFolderId) duplicateData.folderId = targetFolderId;
          if (duplicateByMessageId.uid !== item.uid) duplicateData.uid = item.uid;
          if (duplicateByMessageId.isRead !== isRead) {
            duplicateData.isRead = isRead;
            duplicateData.readAt = isRead ? item.internalDate ?? new Date() : null;
          }
          if ((item.flags.has("\\Flagged") || ruleResult.isFlagged) && !duplicateByMessageId.isFlagged) {
            duplicateData.isFlagged = true;
          }
          if (Object.keys(duplicateData).length > 0) {
            try {
              await db.email.update({ where: { id: duplicateByMessageId.id }, data: duplicateData });
            } catch (error) {
              if (!isUniqueConstraintError(error)) throw error;
              const { folderId: _folderId, uid: _uid, ...safeDuplicateData } = duplicateData;
              if (Object.keys(safeDuplicateData).length > 0) {
                await db.email.update({ where: { id: duplicateByMessageId.id }, data: safeDuplicateData });
              }
            }
            if (duplicateByMessageId.folderId) touchedFolderIds.add(duplicateByMessageId.folderId);
            touchedFolderIds.add(targetFolderId);
            for (const assignment of duplicateByMessageId.labelAssignments) touchedLabelIds.add(assignment.labelId);
          }
          for (const labelId of ruleResult.labelIds) {
            await db.emailLabelAssignment.upsert({
              where: { emailId_labelId: { emailId: duplicateByMessageId.id, labelId } },
              create: { tenantId: account.tenantId, emailId: duplicateByMessageId.id, labelId },
              update: {},
            });
            touchedLabelIds.add(labelId);
          }
          skipped += 1;
          continue;
        }
        if (ruleResult.forwardTo.length > 0) {
          await forwardIncomingMessage(account, ruleResult.forwardTo, parsed).catch((err) =>
            logger.error({ err, accountId: account.id, messageId: parsed.messageId }, "mail rule forward failed"),
          );
        }
        const emailId = randomUUID();
        const attachmentCreates = [];
        for (const a of parsed.attachments) {
          const attachmentId = newMailAttachmentId();
          const mimeType = a.contentType || "application/octet-stream";
          const stored = await writeMailAttachmentBytes({
            tenantId: account.tenantId,
            emailId,
            attachmentId,
            body: a.content,
            contentType: mimeType,
          });
          attachmentCreates.push({
            id: attachmentId,
            tenantId: account.tenantId,
            fileName: a.filename || "attachment",
            mimeType,
            size: a.size || a.content.length,
            contentId: a.contentId ?? null,
            isInline: Boolean(a.related),
            diskRelPath: stored.diskRelPath,
            checksumSha256: stored.checksumSha256,
          });
        }
        let email: { id: string } | null = null;
        try {
          email = await db.email.create({
            data: {
              id: emailId,
              tenantId: account.tenantId,
              accountId: account.id,
              folderId: targetFolderId,
              uid: item.uid,
              messageId: parsed.messageId ?? null,
              direction:
                folder.type === EmailFolderType.SENT ? "OUTBOUND" : "INBOUND",
              isRead,
              readAt: isRead ? item.internalDate ?? new Date() : null,
              isFlagged: item.flags.has("\\Flagged") || ruleResult.isFlagged,
              hasAttachments,
              fromName: from.name,
              fromAddress: from.address,
              to: addressList(parsed.to),
              cc: addressList(parsed.cc),
              subject: parsed.subject ?? null,
              preview: previewFrom(parsed.text),
              textBody: parsed.text ?? null,
              htmlBody: typeof parsed.html === "string" ? parsed.html : null,
              rawHeaders: headersToJson(parsed.headers),
              receivedAt: item.internalDate ?? parsed.date ?? new Date(),
              sentAt: parsed.date ?? null,
              internalDate: item.internalDate,
              labelAssignments: {
                create: ruleResult.labelIds.map((labelId) => ({
                  tenantId: account.tenantId,
                  labelId,
                })),
              },
              attachments: {
                create: attachmentCreates,
              },
            },
          });
        } catch (error) {
          await Promise.all(attachmentCreates.map((a) => deleteMailAttachmentBytes(a.diskRelPath)));
          if (isUniqueConstraintError(error)) {
            skipped += 1;
            continue;
          }
          throw error;
        }
        if (!email) {
          skipped += 1;
          continue;
        }
        if (ruleResult.folderId) touchedFolderIds.add(ruleResult.folderId);
        for (const labelId of ruleResult.labelIds) touchedLabelIds.add(labelId);
        imported += 1;
      }

      await db.emailFolder.update({
        where: { id: folder.id },
        data:
          mode === EmailSyncMode.BACKFILL
            ? { lastBackfillUid: minBackfillUid ?? folder.lastBackfillUid }
            : { lastSyncedUid: maxUid || folder.lastSyncedUid },
      });
      for (const folderId of touchedFolderIds) {
        await refreshFolderCounters(db, account.tenantId, folderId);
      }
      for (const labelId of touchedLabelIds) {
        await refreshLabelCounters(db, account.tenantId, labelId);
      }
      } catch (err) {
        folderErrors += 1;
        logger.error(
          { err, accountId: account.id, folderPath: listed.path, mode },
          "mail folder sync failed",
        );
      }
    }

    await db.emailAccount.update({
      where: { id: account.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError:
          folderErrors > 0
            ? `Не синхронизировано папок: ${folderErrors}. Остальные папки загружены.`
            : null,
      },
    });
    logger.info(
      { accountId: account.id, mode, imported, skipped, folders, folderErrors, elapsedMs: Date.now() - startedAt },
      "mail sync completed",
    );
    return { imported, skipped, folders };
  } catch (err) {
    await db.emailAccount.update({
      where: { id: account.id },
      data: {
        lastSyncError: syncErrorMessage(err),
      },
    }).catch(() => undefined);
    logger.error(
      { err, accountId: account.id, elapsedMs: Date.now() - startedAt },
      "mail sync failed",
    );
    throw err;
  } finally {
    await client.logout().catch(() => undefined);
  }
}
