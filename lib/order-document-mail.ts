/**
 * Исходящие документы по наряду (счёт/УПД) и привязка ответов к наряду.
 * Ящик — тот же, что для долгов ФинОтдела. Тема/текст — шаблон «отправить документы».
 */
import "server-only";
import { EmailFolderType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { resolveClinicInvoiceEmail } from "@/lib/clinic-invoice-email";
import {
  applyFinanceOfficeDebtTemplate,
  FINANCE_OFFICE_DOCUMENT_DEFAULT_SUBJECT,
  FINANCE_OFFICE_DOCUMENT_DEFAULT_TEMPLATE,
  financeOfficeDebtEmailHtml,
  financeOfficeDebtInvoiceCaption,
  financeOfficeDebtUpdCaption,
} from "@/lib/finance-office-debt-settings";
import { looksLikeDebtNotifyEmail } from "@/lib/finance-office-debts";
import {
  extractReplyParentMessageIds,
  normalizeMailMessageId,
} from "@/lib/mail/in-reply-to";
import {
  newMailAttachmentId,
  writeMailAttachmentBytes,
} from "@/lib/mail/mail-attachment-storage";
import { previewFromText } from "@/lib/mail/mail-preview";
import { sendSmtpMessage } from "@/lib/mail/smtp-client";
import { readOrderAttachmentBytes } from "@/lib/order-attachment-storage";
import { logger } from "@/lib/server/logger";

async function resolveFoMailAccount(db: PrismaClient, tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { financeOfficeDebtEmailAccountId: true },
  });
  const preferredId = tenant?.financeOfficeDebtEmailAccountId ?? null;
  return (
    (preferredId
      ? await db.emailAccount.findFirst({
          where: { id: preferredId, tenantId, isActive: true },
        })
      : null) ??
    (await db.emailAccount.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "asc" },
    }))
  );
}

async function ensureSentFolder(
  db: PrismaClient,
  tenantId: string,
  accountId: string,
) {
  const existing = await db.emailFolder.findFirst({
    where: { tenantId, accountId, type: EmailFolderType.SENT },
  });
  if (existing) return existing;
  return db.emailFolder.create({
    data: {
      tenantId,
      accountId,
      imapName: "Sent",
      displayName: "Отправленные",
      type: EmailFolderType.SENT,
      sortOrder: 20,
    },
  });
}

async function persistOutboundAndLink(opts: {
  db: PrismaClient;
  tenantId: string;
  orderId: string;
  account: { id: string; email: string; displayName: string | null };
  to: string;
  subject: string;
  text: string;
  html: string;
  messageId: string | null;
  threadId: string | null;
  attachments: Array<{ filename: string; contentType: string; content: Buffer }>;
}) {
  const sentFolder = await ensureSentFolder(
    opts.db,
    opts.tenantId,
    opts.account.id,
  );
  const email = await opts.db.email.create({
    data: {
      tenantId: opts.tenantId,
      accountId: opts.account.id,
      folderId: sentFolder.id,
      messageId: opts.messageId,
      threadId: opts.threadId,
      direction: "OUTBOUND",
      isRead: true,
      readAt: new Date(),
      hasAttachments: opts.attachments.length > 0,
      fromName: opts.account.displayName,
      fromAddress: opts.account.email,
      to: [{ address: opts.to, name: null }],
      subject: opts.subject,
      preview: previewFromText(opts.text),
      textBody: opts.text,
      htmlBody: opts.html,
      sentAt: new Date(),
      receivedAt: new Date(),
    },
  });
  for (const a of opts.attachments) {
    const attachmentId = newMailAttachmentId();
    const stored = await writeMailAttachmentBytes({
      tenantId: opts.tenantId,
      emailId: email.id,
      attachmentId,
      body: a.content,
      contentType: a.contentType,
    });
    await opts.db.emailAttachment.create({
      data: {
        id: attachmentId,
        tenantId: opts.tenantId,
        emailId: email.id,
        fileName: a.filename,
        mimeType: a.contentType,
        size: a.content.length,
        diskRelPath: stored.diskRelPath,
        checksumSha256: stored.checksumSha256,
      },
    });
  }
  await opts.db.emailSourceOrder.upsert({
    where: { orderId_emailId: { orderId: opts.orderId, emailId: email.id } },
    create: {
      tenantId: opts.tenantId,
      orderId: opts.orderId,
      emailId: email.id,
      isReplyTarget: true,
    },
    update: {},
  });
  return email;
}

export async function linkInboundEmailToDocumentThread(
  db: PrismaClient,
  tenantId: string,
  emailId: string,
  rawHeaders: unknown,
): Promise<void> {
  const parentIds = extractReplyParentMessageIds(rawHeaders);
  if (parentIds.length === 0) return;
  const variants = parentIds.flatMap((id) => {
    const n = normalizeMailMessageId(id);
    const bare = n.replace(/^<|>$/g, "");
    return [n, bare];
  });
  const parent = await db.email.findFirst({
    where: {
      tenantId,
      messageId: { in: [...new Set(variants)] },
      sourceOrderLinks: { some: {} },
    },
    select: {
      threadId: true,
      sourceOrderLinks: { select: { orderId: true }, take: 8 },
    },
  });
  if (!parent?.sourceOrderLinks.length) return;
  await db.email.update({
    where: { id: emailId },
    data: { threadId: parent.threadId ?? parentIds[0] ?? null },
  });
  for (const link of parent.sourceOrderLinks) {
    await db.emailSourceOrder.upsert({
      where: { orderId_emailId: { orderId: link.orderId, emailId } },
      create: {
        tenantId,
        orderId: link.orderId,
        emailId,
        isReplyTarget: true,
      },
      update: {},
    });
  }
}

export async function sendOrderDocumentsMail(opts: {
  db: PrismaClient;
  tenantId: string;
  orderId: string;
}): Promise<{ ok: true; to: string } | { ok: false; error: string; status: number }> {
  const account = await resolveFoMailAccount(opts.db, opts.tenantId);
  if (!account?.encryptedAppPassword) {
    return {
      ok: false,
      status: 400,
      error:
        "Нет настроенного почтового ящика. Выберите ящик в Конфигурация → ФинОтдел.",
    };
  }
  const tenant = await opts.db.tenant.findUnique({
    where: { id: opts.tenantId },
    select: {
      financeOfficeDocumentEmailSubject: true,
      financeOfficeDocumentEmailTemplate: true,
    },
  });
  const order = await opts.db.order.findFirst({
    where: { id: opts.orderId, tenantId: opts.tenantId, archivedAt: null },
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      invoiceNumber: true,
      invoiceIssuedAt: true,
      updNumber: true,
      invoiceAttachmentId: true,
      clinic: {
        select: {
          name: true,
          email: true,
          invoiceEmail: true,
          useEmailForInvoices: true,
        },
      },
      invoiceAttachment: {
        select: {
          fileName: true,
          mimeType: true,
          data: true,
          diskRelPath: true,
          createdAt: true,
        },
      },
      updAttachment: {
        select: {
          fileName: true,
          mimeType: true,
          data: true,
          diskRelPath: true,
          createdAt: true,
        },
      },
    },
  });
  if (!order) {
    return { ok: false, status: 404, error: "Наряд не найден" };
  }
  if (!order.invoiceAttachmentId || !order.invoiceAttachment) {
    return { ok: false, status: 400, error: "Сначала загрузите файл счёта." };
  }
  const to = order.clinic ? resolveClinicInvoiceEmail(order.clinic) : "";
  if (!looksLikeDebtNotifyEmail(to)) {
    return {
      ok: false,
      status: 400,
      error:
        "Нет почты для счетов. Укажите e-mail в реквизитах клиники.",
    };
  }
  const vars = {
    номер: order.orderNumber,
    пациент: order.patientName?.trim() || "—",
    клиника: order.clinic?.name?.trim() || "—",
    счёт: financeOfficeDebtInvoiceCaption(
      order.invoiceNumber,
      order.invoiceIssuedAt ?? order.invoiceAttachment.createdAt,
    ),
    упд: financeOfficeDebtUpdCaption(
      order.updNumber,
      order.updAttachment?.createdAt ?? null,
    ),
  };
  const subject = applyFinanceOfficeDebtTemplate(
    tenant?.financeOfficeDocumentEmailSubject?.trim() ||
      FINANCE_OFFICE_DOCUMENT_DEFAULT_SUBJECT,
    vars,
  );
  const text = applyFinanceOfficeDebtTemplate(
    tenant?.financeOfficeDocumentEmailTemplate?.trim() ||
      FINANCE_OFFICE_DOCUMENT_DEFAULT_TEMPLATE,
    vars,
  );
  const html = financeOfficeDebtEmailHtml(text);
  const attachments: Array<{
    filename: string;
    contentType: string;
    content: Buffer;
  }> = [];
  try {
    attachments.push({
      filename: order.invoiceAttachment.fileName,
      contentType: order.invoiceAttachment.mimeType || "application/octet-stream",
      content: await readOrderAttachmentBytes(order.invoiceAttachment),
    });
  } catch {
    return { ok: false, status: 400, error: "Не удалось прочитать файл счёта." };
  }
  if (order.updAttachment) {
    try {
      attachments.push({
        filename: order.updAttachment.fileName,
        contentType: order.updAttachment.mimeType || "application/octet-stream",
        content: await readOrderAttachmentBytes(order.updAttachment),
      });
    } catch {
      logger.warn({ orderId: order.id }, "document mail: upd unreadable");
    }
  }
  const sent = await sendSmtpMessage(account, { to, subject, text, html, attachments });
  const messageId = sent.messageId;
  await persistOutboundAndLink({
    db: opts.db,
    tenantId: opts.tenantId,
    orderId: order.id,
    account,
    to,
    subject,
    text,
    html,
    messageId,
    threadId: messageId,
    attachments,
  });
  return { ok: true, to };
}

export async function replyOrderDocumentMail(opts: {
  db: PrismaClient;
  tenantId: string;
  orderId: string;
  body: string;
}): Promise<{ ok: true; to: string } | { ok: false; error: string; status: number }> {
  const text = opts.body.trim();
  if (!text) {
    return { ok: false, status: 400, error: "Введите текст ответа." };
  }
  if (text.length > 20000) {
    return { ok: false, status: 400, error: "Текст ответа слишком длинный." };
  }
  const account = await resolveFoMailAccount(opts.db, opts.tenantId);
  if (!account?.encryptedAppPassword) {
    return {
      ok: false,
      status: 400,
      error:
        "Нет настроенного почтового ящика. Выберите ящик в Конфигурация → ФинОтдел.",
    };
  }
  const links = await opts.db.emailSourceOrder.findMany({
    where: { tenantId: opts.tenantId, orderId: opts.orderId },
    orderBy: { createdAt: "desc" },
    select: {
      email: {
        select: {
          messageId: true,
          threadId: true,
          subject: true,
          fromAddress: true,
          direction: true,
        },
      },
    },
  });
  if (links.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "Сначала отправьте документы — затем можно ответить в переписке.",
    };
  }
  const inbound = links.find((l) => l.email.direction === "INBOUND");
  const latest = inbound ?? links[0]!;
  const to =
    latest.email.direction === "INBOUND"
      ? latest.email.fromAddress?.trim() || ""
      : "";
  const clinicTo =
    to ||
    (await opts.db.order
      .findFirst({
        where: { id: opts.orderId, tenantId: opts.tenantId },
        select: {
          clinic: {
            select: {
              email: true,
              invoiceEmail: true,
              useEmailForInvoices: true,
            },
          },
        },
      })
      .then((o) => (o?.clinic ? resolveClinicInvoiceEmail(o.clinic) : "")));
  if (!looksLikeDebtNotifyEmail(clinicTo)) {
    return {
      ok: false,
      status: 400,
      error: "Нет адреса для ответа.",
    };
  }
  const parentId = latest.email.messageId?.trim() || null;
  const subjectRaw = latest.email.subject?.trim() || "Документы";
  const subject = /^(re|ответ)\s*:/iu.test(subjectRaw)
    ? subjectRaw
    : `Re: ${subjectRaw}`;
  const html = financeOfficeDebtEmailHtml(text);
  const sent = await sendSmtpMessage(account, {
    to: clinicTo,
    subject,
    text,
    html,
    inReplyTo: parentId,
    references: parentId,
  });
  await persistOutboundAndLink({
    db: opts.db,
    tenantId: opts.tenantId,
    orderId: opts.orderId,
    account,
    to: clinicTo,
    subject,
    text,
    html,
    messageId: sent.messageId,
    threadId: latest.email.threadId ?? parentId ?? sent.messageId,
    attachments: [],
  });
  return { ok: true, to: clinicTo };
}
