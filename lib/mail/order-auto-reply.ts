import "server-only";
import type { PrismaClient } from "@prisma/client";
import {
  defaultReplySubject,
  renderEmailReplyTemplate,
  type EmailReplyTemplateContext,
} from "@/lib/mail/email-reply-template";
export { resolveReplyToSourceEmailId } from "@/lib/mail/email-reply-template";
import { sendEmail } from "@/lib/mail/mail-service";
import { logger } from "@/lib/server/logger";

export type OrderAutoReplyResult =
  | { ok: true; to: string; emailId: string }
  | { ok: false; error: string }
  | { skipped: true; reason: string };

function formatMailDateTime(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function senderLabel(fromName: string | null | undefined, fromAddress: string | null | undefined): string {
  const name = fromName?.trim();
  const addr = fromAddress?.trim();
  if (name && addr) return `${name} <${addr}>`;
  return name || addr || "";
}

function buildReferences(messageId: string | null | undefined): string | null {
  const trimmed = messageId?.trim();
  return trimmed || null;
}

export async function sendOrderAutoReply(params: {
  db: PrismaClient;
  tenantId: string;
  userId: string;
  role: string;
  orderId: string;
  replyToSourceEmailId: string;
}): Promise<OrderAutoReplyResult> {
  const started = Date.now();
  const { db, tenantId, userId, role, orderId, replyToSourceEmailId } = params;
  try {
    const link = await db.emailSourceOrder.findFirst({
      where: { tenantId, orderId, emailId: replyToSourceEmailId },
      select: {
        id: true,
        email: {
          select: {
            id: true,
            accountId: true,
            messageId: true,
            threadId: true,
            fromName: true,
            fromAddress: true,
            subject: true,
            receivedAt: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            patientName: true,
            dueDate: true,
            dueToAdminsAt: true,
            doctor: { select: { fullName: true } },
            clinic: { select: { name: true } },
          },
        },
      },
    });
    if (!link?.email) {
      return { skipped: true, reason: "Исходное письмо не найдено" };
    }
    const toAddress = link.email.fromAddress?.trim();
    if (!toAddress) {
      return { skipped: true, reason: "У письма нет адреса отправителя" };
    }

    const template = await db.emailReplyTemplate.findUnique({
      where: { accountId: link.email.accountId },
    });
    if (!template) {
      return { skipped: true, reason: "Шаблон автоответа не настроен для этого ящика" };
    }
    if (!template.isEnabled) {
      return { skipped: true, reason: "Автоответ отключён в настройках ящика" };
    }
    if (!template.htmlTemplate.trim()) {
      return { skipped: true, reason: "Текст шаблона пустой" };
    }

    const context: EmailReplyTemplateContext = {
      orderNumber: link.order.orderNumber,
      patientName: link.order.patientName?.trim() || "—",
      doctorName: link.order.doctor.fullName?.trim() || "—",
      clinicName: link.order.clinic?.name?.trim() || "Частное лицо",
      dueDate: formatMailDateTime(link.order.dueDate),
      appointmentDate: formatMailDateTime(link.order.dueToAdminsAt),
      originalSubject: link.email.subject?.trim() || "",
      originalFrom: senderLabel(link.email.fromName, link.email.fromAddress),
    };

    const subjectRaw = template.subjectTemplate.trim();
    const subject = subjectRaw
      ? renderEmailReplyTemplate(subjectRaw, context)
      : defaultReplySubject(context.originalSubject);
    const html = renderEmailReplyTemplate(template.htmlTemplate, context, { html: true });
    const inReplyTo = buildReferences(link.email.messageId);
    const references = inReplyTo;
    const threadId = link.email.threadId?.trim() || inReplyTo;

    const sent = await sendEmail(db, tenantId, userId, role, {
      accountId: link.email.accountId,
      to: toAddress,
      subject,
      html,
      attachments: [],
      inReplyTo,
      references,
      threadId,
    });

    await db.emailSourceOrder.update({
      where: { id: link.id },
      data: {
        isReplyTarget: true,
        autoReplySentAt: new Date(),
        autoReplyEmailId: sent.email.id,
      },
    });

    logger.info(
      {
        msg: "order_auto_reply_sent",
        tenantId,
        orderId,
        sourceEmailId: replyToSourceEmailId,
        accountId: link.email.accountId,
        durationMs: Date.now() - started,
      },
      "order-auto-reply",
    );

    return { ok: true, to: toAddress, emailId: sent.email.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      {
        err,
        msg: "order_auto_reply_failed",
        tenantId,
        orderId,
        replyToSourceEmailId,
        durationMs: Date.now() - started,
      },
      "order-auto-reply",
    );
    return { ok: false, error: message };
  }
}
