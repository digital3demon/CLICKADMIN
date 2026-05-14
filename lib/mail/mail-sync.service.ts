import "server-only";
import { EmailFolderType, type EmailAccount, type PrismaClient } from "@prisma/client";
import { simpleParser, type ParsedMail } from "mailparser";
import { logger } from "@/lib/server/logger";
import {
  createImapClient,
  fetchFolderMessages,
  listImapFolders,
  type ImapFolderInfo,
} from "@/lib/mail/imap-client";

const MAX_MESSAGES_PER_FOLDER = 120;

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

function bytesForPrisma(value: Buffer): Uint8Array<ArrayBuffer> {
  const copy = new ArrayBuffer(value.byteLength);
  const view = new Uint8Array(copy);
  view.set(value);
  return view;
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
): Promise<{ imported: number; skipped: number; folders: number }> {
  const startedAt = Date.now();
  const client = createImapClient(account);
  let imported = 0;
  let skipped = 0;
  let folders = 0;

  await client.connect();
  try {
    const listedFolders = await listImapFolders(client);
    for (const listed of listedFolders) {
      const folder = await upsertFolder(db, account, listed);
      folders += 1;
      let maxUid = folder.lastSyncedUid ?? 0;
      let processed = 0;
      for await (const item of fetchFolderMessages(client, listed.path, maxUid + 1)) {
        if (processed >= MAX_MESSAGES_PER_FOLDER) break;
        processed += 1;
        maxUid = Math.max(maxUid, item.uid);

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
        await db.email.create({
          data: {
            tenantId: account.tenantId,
            accountId: account.id,
            folderId: folder.id,
            uid: item.uid,
            messageId: parsed.messageId ?? null,
            direction:
              folder.type === EmailFolderType.SENT ? "OUTBOUND" : "INBOUND",
            isRead: item.flags.has("\\Seen"),
            readAt: item.flags.has("\\Seen") ? item.internalDate ?? new Date() : null,
            isFlagged: item.flags.has("\\Flagged"),
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
            attachments: {
              create: parsed.attachments.map((a) => ({
                tenantId: account.tenantId,
                fileName: a.filename || "attachment",
                mimeType: a.contentType || "application/octet-stream",
                size: a.size || a.content.length,
                contentId: a.contentId ?? null,
                isInline: Boolean(a.related),
                data: bytesForPrisma(a.content),
              })),
            },
          },
        });
        imported += 1;
      }

      await db.emailFolder.update({
        where: { id: folder.id },
        data: { lastSyncedUid: maxUid || folder.lastSyncedUid },
      });
      await refreshFolderCounters(db, account.tenantId, folder.id);
    }

    await db.emailAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });
    logger.info(
      { accountId: account.id, imported, skipped, folders, elapsedMs: Date.now() - startedAt },
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
