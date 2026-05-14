import "server-only";
import nodemailer from "nodemailer";
import type { EmailAccount } from "@prisma/client";
import { decryptAppPassword } from "@/lib/mail/encryption";

export type MailSendAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
};

export type MailSendPayload = {
  to: string;
  cc?: string | null;
  bcc?: string | null;
  subject: string;
  html: string;
  text?: string;
  attachments?: MailSendAttachment[];
};

type SmtpAccount = Pick<
  EmailAccount,
  "email" | "displayName" | "encryptedAppPassword" | "smtpHost" | "smtpPort" | "smtpSecure"
>;

function fromAddress(account: Pick<EmailAccount, "email" | "displayName">): string {
  return account.displayName?.trim()
    ? `"${account.displayName.replaceAll('"', "'")}" <${account.email}>`
    : account.email;
}

export async function sendSmtpMessage(
  account: SmtpAccount,
  payload: MailSendPayload,
): Promise<{ messageId: string | null; accepted: string[]; rejected: string[] }> {
  if (!account.encryptedAppPassword) {
    throw new Error("MAIL_ACCOUNT_PASSWORD_NOT_CONFIGURED");
  }
  const transport = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: {
      user: account.email,
      pass: decryptAppPassword(account.encryptedAppPassword),
    },
  });

  const info = await transport.sendMail({
    from: fromAddress(account),
    to: payload.to,
    cc: payload.cc || undefined,
    bcc: payload.bcc || undefined,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    attachments: payload.attachments?.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      content: a.content,
    })),
  });

  return {
    messageId: typeof info.messageId === "string" ? info.messageId : null,
    accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
    rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
  };
}
