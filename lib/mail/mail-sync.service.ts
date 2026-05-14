import "server-only";
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
  listImapFolders,
  type ImapFolderInfo,
} from "@/lib/mail/imap-client";
import {
  newMailAttachmentId,
  writeMailAttachmentBytes,
} from "@/lib/mail/mail-attachment-storage";

const RECENT_MESSAGES_PER_INBOX = 40;
const BACKFILL_MESSAGES_PER_FOLDER = 120;

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
  return type === EmailFolderType.INBOX;
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

function previewFrom(text: string | undefined): string | null {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 320) : null;
}

function headersToJson(headers: ParsedMail["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    out[key] = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  }
  return out;
}

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

function booleanFromJsonField(value: unknown, key: string): boolean {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>)[key] === true);
}

function nullableStringFromJsonField(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function ruleMatches(
  rule: Pick<EmailRule, "conditions">,
  message: { from: string; subject: string; body: string },
): boolean {
  const from = stringFromJsonField(rule.conditions, "from");
  const subject = stringFromJsonField(rule.conditions, "subject");
  const body = stringFromJsonField(rule.conditions, "body");
  if (from && !message.from.toLowerCase().includes(from)) return false;
  if (subject && !message.subject.toLowerCase().includes(subject)) return false;
  if (body && !message.body.toLowerCase().includes(body)) return false;
  return Boolean(from || subject || body);
}

async function applyIncomingRules(
  db: PrismaClient,
  account: Pick<EmailAccount, "id" | "tenantId">,
  rules: EmailRule[],
  message: { from: string; subject: string; body: string },
): Promise<{ isFlagged: boolean; labelIds: string[]; folderId: string | null }> {
  let isFlagged = false;
  const labelIds = new Set<string>();
  let folderId: string | null = null;

  for (const rule of rules) {
    if (!ruleMatches(rule, message)) continue;
    isFlagged ||= booleanFromJsonField(rule.actions, "markImportant");
    for (const labelId of stringArrayFromJsonField(rule.actions, "labelIds")) {
      labelIds.add(labelId);
    }
    folderId = nullableStringFromJsonField(rule.actions, "moveToFolderId") ?? folderId;
  }

  if (labelIds.size > 0) {
    const existing = await db.emailLabel.findMany({
      where: { tenantId: account.tenantId, accountId: account.id, id: { in: [...labelIds] } },
      select: { id: true },
    });
    labelIds.clear();
    existing.forEach((label) => labelIds.add(label.id));
  }

  if (folderId) {
    const folder = await db.emailFolder.findFirst({
      where: { tenantId: account.tenantId, accountId: account.id, id: folderId },
      select: { id: true },
    });
    folderId = folder?.id ?? null;
  }

  return { isFlagged, labelIds: [...labelIds], folderId };
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

  await client.connect();
  try {
    const activeRules = await db.emailRule.findMany({
      where: { tenantId: account.tenantId, accountId: account.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const listedFolders = await listImapFolders(client);
    for (const listed of listedFolders) {
      const folder = await upsertFolder(db, account, listed);
      folders += 1;
      if (!shouldSyncFolderForMode(folder.type, mode)) continue;
      let maxUid = folder.lastSyncedUid ?? 0;
      let minBackfillUid = folder.lastBackfillUid ?? null;
      let processed = 0;
      const maxMessages =
        mode === EmailSyncMode.BACKFILL
          ? BACKFILL_MESSAGES_PER_FOLDER
          : RECENT_MESSAGES_PER_INBOX;
      const messages =
        mode === EmailSyncMode.BACKFILL
          ? fetchFolderMessagesBefore(client, listed.path, folder.lastBackfillUid, maxMessages)
          : fetchFolderMessages(client, listed.path, maxUid + 1, maxMessages);
      for await (const item of messages) {
        if (processed >= maxMessages) break;
        processed += 1;
        maxUid = Math.max(maxUid, item.uid);
        minBackfillUid = minBackfillUid == null ? item.uid : Math.min(minBackfillUid, item.uid);

        const exists = await db.email.findFirst({
          where: {
            tenantId: account.tenantId,
            accountId: account.id,
            folderId: folder.id,
            uid: item.uid,
          },
          select: { id: true },
        });
        if (exists) {
          skipped += 1;
          continue;
        }

        const parsed = await simpleParser(item.source);
        const from = firstAddress(parsed.from);
        const hasAttachments = parsed.attachments.length > 0;
        const ruleResult =
          folder.type === EmailFolderType.INBOX
            ? await applyIncomingRules(db, account, activeRules, {
                from: [from.name, from.address].filter(Boolean).join(" "),
                subject: parsed.subject ?? "",
                body: parsed.text ?? "",
              })
            : { isFlagged: false, labelIds: [], folderId: null };
        const email = await db.email.create({
          data: {
            tenantId: account.tenantId,
            accountId: account.id,
            folderId: ruleResult.folderId ?? folder.id,
            uid: item.uid,
            messageId: parsed.messageId ?? null,
            direction:
              folder.type === EmailFolderType.SENT ? "OUTBOUND" : "INBOUND",
            isRead: item.flags.has("\\Seen"),
            readAt: item.flags.has("\\Seen") ? item.internalDate ?? new Date() : null,
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
          },
        });
        for (const a of parsed.attachments) {
          const attachmentId = newMailAttachmentId();
          const mimeType = a.contentType || "application/octet-stream";
          const stored = await writeMailAttachmentBytes({
            tenantId: account.tenantId,
            emailId: email.id,
            attachmentId,
            body: a.content,
            contentType: mimeType,
          });
          await db.emailAttachment.create({
            data: {
              id: attachmentId,
              tenantId: account.tenantId,
              emailId: email.id,
              fileName: a.filename || "attachment",
              mimeType,
              size: a.size || a.content.length,
              contentId: a.contentId ?? null,
              isInline: Boolean(a.related),
              diskRelPath: stored.diskRelPath,
              checksumSha256: stored.checksumSha256,
            },
          });
        }
        imported += 1;
      }

      await db.emailFolder.update({
        where: { id: folder.id },
        data:
          mode === EmailSyncMode.BACKFILL
            ? { lastBackfillUid: minBackfillUid ?? folder.lastBackfillUid }
            : { lastSyncedUid: maxUid || folder.lastSyncedUid },
      });
      await refreshFolderCounters(db, account.tenantId, folder.id);
    }

    await db.emailAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });
    logger.info(
      { accountId: account.id, mode, imported, skipped, folders, elapsedMs: Date.now() - startedAt },
      "mail sync completed",
    );
    return { imported, skipped, folders };
  } catch (err) {
    await db.emailAccount.update({
      where: { id: account.id },
      data: {
        lastSyncError: err instanceof Error ? err.message : "Ошибка синхронизации",
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
