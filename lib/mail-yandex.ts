import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import nodemailer from "nodemailer";
import type { MailMailbox, PrismaClient } from "@prisma/client";
import { decryptMailSecret } from "@/lib/mail-crypto";
import { applyMailRules } from "@/lib/mail-rules";

type MailboxForConnection = Pick<
  MailMailbox,
  | "id"
  | "tenantId"
  | "email"
  | "displayName"
  | "imapHost"
  | "imapPort"
  | "imapSecure"
  | "smtpHost"
  | "smtpPort"
  | "smtpSecure"
  | "encryptedPassword"
  | "lastSyncUid"
>;

function passwordFor(mailbox: MailboxForConnection): string {
  if (!mailbox.encryptedPassword) {
    throw new Error("MAILBOX_PASSWORD_NOT_CONFIGURED");
  }
  return decryptMailSecret(mailbox.encryptedPassword);
}

function addressText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(addressText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const obj = value as { name?: string; address?: string };
    if (obj.name && obj.address) return `${obj.name} <${obj.address}>`;
    return obj.address ?? obj.name ?? "";
  }
  return String(value);
}

function parsedAddressText(
  value: ParsedMail["from"] | ParsedMail["to"] | ParsedMail["cc"],
): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.flatMap((x) => x.value).map(addressText).filter(Boolean).join(", ");
  }
  return addressText(value.value);
}

function previewFrom(text: string | undefined): string | null {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 280) : null;
}

function headersToJson(headers: Headers | Map<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
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

export async function syncMailboxInbox(
  db: PrismaClient,
  mailbox: MailboxForConnection,
): Promise<{ imported: number; skipped: number; lastUid: number | null }> {
  const client = new ImapFlow({
    host: mailbox.imapHost,
    port: mailbox.imapPort,
    secure: mailbox.imapSecure,
    auth: { user: mailbox.email, pass: passwordFor(mailbox) },
    logger: false,
  });
  let imported = 0;
  let skipped = 0;
  let maxUid = mailbox.lastSyncUid ?? null;

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const startUid = (mailbox.lastSyncUid ?? 0) + 1;
      const range = `${startUid}:*`;
      const rules = await db.mailRule.findMany({
        where: { tenantId: mailbox.tenantId, mailboxId: mailbox.id, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, conditions: true, actions: true },
      });

      for await (const item of client.fetch(
        range,
        { uid: true, source: true, flags: true, internalDate: true },
        { uid: true },
      )) {
        if (!item.uid || item.uid < startUid) continue;
        maxUid = Math.max(maxUid ?? 0, item.uid);
        const exists = await db.mailMessage.findUnique({
          where: {
            mailboxId_folder_uid: {
              mailboxId: mailbox.id,
              folder: "INBOX",
              uid: item.uid,
            },
          },
          select: { id: true },
        });
        if (exists) {
          skipped += 1;
          continue;
        }

        if (!item.source) {
          skipped += 1;
          continue;
        }
        const parsed = (await simpleParser(item.source)) as ParsedMail;
        const fromText = parsedAddressText(parsed.from);
        const toText = parsedAddressText(parsed.to);
        const ccText = parsedAddressText(parsed.cc);
        const ruleResult = applyMailRules(rules, {
          fromText,
          toText,
          subject: parsed.subject ?? null,
          textBody: parsed.text ?? null,
        });

        await db.mailMessage.create({
          data: {
            tenantId: mailbox.tenantId,
            mailboxId: mailbox.id,
            folder: "INBOX",
            uid: item.uid,
            messageId: parsed.messageId ?? null,
            direction: "INBOUND",
            readState: item.flags?.has("\\Seen") ? "READ" : "UNREAD",
            fromText,
            toText: toText || null,
            ccText: ccText || null,
            subject: parsed.subject ?? null,
            textBody: parsed.text ?? null,
            htmlBody: typeof parsed.html === "string" ? parsed.html : null,
            preview: previewFrom(parsed.text),
            labels: ruleResult.labels.length ? ruleResult.labels : undefined,
            assignedUserId: ruleResult.assignedUserId,
            isImportant: ruleResult.isImportant,
            crmFolder: ruleResult.crmFolder,
            receivedAt: item.internalDate ?? parsed.date ?? new Date(),
            sentAt: parsed.date ?? null,
            rawHeaders: headersToJson(parsed.headers),
            ruleLog: ruleResult.ruleLog.length ? ruleResult.ruleLog : undefined,
            attachments: {
              create: parsed.attachments.map((a) => ({
                tenantId: mailbox.tenantId,
                fileName: a.filename || "attachment",
                mimeType: a.contentType || "application/octet-stream",
                size: a.size || a.content.length,
                contentId: a.contentId ?? null,
                data: bytesForPrisma(a.content),
              })),
            },
          },
        });
        imported += 1;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  await db.mailMailbox.update({
    where: { id: mailbox.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncUid: maxUid,
      lastSyncError: null,
    },
  });

  return { imported, skipped, lastUid: maxUid };
}

export async function sendMailboxMessage(
  db: PrismaClient,
  mailbox: MailboxForConnection,
  input: {
    to: string;
    cc?: string | null;
    bcc?: string | null;
    subject: string;
    text: string;
    html?: string | null;
    attachments?: Array<{ filename: string; contentType: string; content: Buffer }>;
  },
): Promise<{ messageId: string | null; mailMessageId: string }> {
  const transport = nodemailer.createTransport({
    host: mailbox.smtpHost,
    port: mailbox.smtpPort,
    secure: mailbox.smtpSecure,
    auth: { user: mailbox.email, pass: passwordFor(mailbox) },
  });
  const sent = await transport.sendMail({
    from: mailbox.displayName ? `${mailbox.displayName} <${mailbox.email}>` : mailbox.email,
    to: input.to,
    cc: input.cc || undefined,
    bcc: input.bcc || undefined,
    subject: input.subject,
    text: input.text,
    html: input.html || undefined,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      content: a.content,
    })),
  });
  const messageId = typeof sent.messageId === "string" ? sent.messageId : null;
  const row = await db.mailMessage.create({
    data: {
      tenantId: mailbox.tenantId,
      mailboxId: mailbox.id,
      folder: "SENT",
      messageId,
      direction: "OUTBOUND",
      readState: "READ",
      fromText: mailbox.email,
      toText: input.to,
      ccText: input.cc || null,
      bccText: input.bcc || null,
      subject: input.subject,
      textBody: input.text,
      htmlBody: input.html || null,
      preview: previewFrom(input.text),
      sentAt: new Date(),
      attachments: {
        create: (input.attachments ?? []).map((a) => ({
          tenantId: mailbox.tenantId,
          fileName: a.filename,
          mimeType: a.contentType,
          size: a.content.length,
          data: bytesForPrisma(a.content),
        })),
      },
    },
    select: { id: true },
  });
  return { messageId, mailMessageId: row.id };
}
