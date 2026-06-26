import "server-only";
import type { PrismaClient } from "@prisma/client";
import {
  defaultReplySubject,
  renderEmailReplyTemplate,
  substituteOrderNumberPlaceholders,
} from "@/lib/mail/email-reply-template";
export { resolveReplyToSourceEmailId } from "@/lib/mail/email-reply-template";
import { buildEmailReplyTemplateContext } from "@/lib/mail/build-email-reply-context";
import { listEmailReplyTemplateAssetsForSend, sendEmail } from "@/lib/mail/mail-service";
import {
  collectReplyTemplateMailAttachments,
  normalizeReplyHtmlForSend,
} from "@/lib/mail/reply-template-cid";
import { resolveOrderStatusUrl } from "@/lib/mail/order-status-url";
import {
  buildHtmlFromReplyTemplate,
  resolveLayoutType,
} from "@/lib/mail/reply-template-render";
import type { ReplyPreflightOverrides } from "@/lib/mail/reply-block-editor";
import { logger } from "@/lib/server/logger";

export type OrderAutoReplyResult =
  | { ok: true; to: string; emailId: string }
  | { ok: false; error: string }
  | { skipped: true; reason: string };

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
  overrideSubject?: string | null;
  overrideHtml?: string | null;
  preflightOverrides?: ReplyPreflightOverrides | null;
}): Promise<OrderAutoReplyResult> {
  const started = Date.now();
  const {
    db,
    tenantId,
    userId,
    role,
    orderId,
    replyToSourceEmailId,
    overrideSubject,
    overrideHtml,
    preflightOverrides,
  } = params;
  const subjectOverride = overrideSubject?.trim() ?? "";
  const htmlOverride = overrideHtml?.trim() ?? "";
  const useOverride = subjectOverride.length > 0 && htmlOverride.length > 0;
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
            clinic: { select: { name: true, address: true } },
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
    if (!useOverride) {
      if (!template) {
        return { skipped: true, reason: "Шаблон автоответа не настроен для этого ящика" };
      }
      if (!template.htmlTemplate.trim()) {
        return { skipped: true, reason: "Текст шаблона пустой" };
      }
    }

    const tenantRow = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    const orderStatusUrl = await resolveOrderStatusUrl(
      db,
      tenantId,
      orderId,
      tenantRow?.slug ?? "lab",
    );

    const context = buildEmailReplyTemplateContext({
      orderNumber: link.order.orderNumber,
      patientName: link.order.patientName,
      doctorName: link.order.doctor.fullName,
      clinicName: link.order.clinic?.name,
      clinicAddress: link.order.clinic?.address,
      dueDate: link.order.dueDate,
      appointmentDate: link.order.dueToAdminsAt,
      originalSubject: link.email.subject,
      originalFromName: link.email.fromName,
      originalFromAddress: link.email.fromAddress,
      orderStatusUrl,
    });

    const assetRows = await listEmailReplyTemplateAssetsForSend(
      db,
      tenantId,
      link.email.accountId,
    );
    const assetsForRender = assetRows.map((row) => ({
      id: row.id,
      contentId: row.contentId,
    }));

    const subject = useOverride
      ? substituteOrderNumberPlaceholders(subjectOverride, link.order.orderNumber)
      : (() => {
          const subjectRaw = template!.subjectTemplate.trim();
          return subjectRaw
            ? renderEmailReplyTemplate(subjectRaw, context)
            : defaultReplySubject(context.originalSubject);
        })();

    let html: string;
    if (useOverride) {
      html = substituteOrderNumberPlaceholders(htmlOverride, link.order.orderNumber);
    } else if (template) {
      const layoutType = resolveLayoutType(
        template.layoutType,
        template.htmlTemplate,
        template.editorDocument,
      );
      if (layoutType === "blocks") {
        html = buildHtmlFromReplyTemplate(
          "blocks",
          template.htmlTemplate,
          template.editorDocument,
          context,
          assetsForRender,
          preflightOverrides,
        );
      } else {
        html = renderEmailReplyTemplate(template.htmlTemplate, context, { html: true });
      }
    } else {
      html = "";
    }
    html = normalizeReplyHtmlForSend(html);
    const inReplyTo = buildReferences(link.email.messageId);
    const references = inReplyTo;
    const threadId = link.email.threadId?.trim() || inReplyTo;

    const attachments = collectReplyTemplateMailAttachments(
      html,
      assetRows.map((row) => ({
        id: row.id,
        fileName: row.fileName,
        mimeType: row.mimeType,
        kind: row.kind,
        contentId: row.contentId,
        data: Buffer.from(row.data),
      })),
    );

    const sent = await sendEmail(db, tenantId, userId, role, {
      accountId: link.email.accountId,
      to: toAddress,
      subject,
      html,
      attachments,
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
        attachmentCount: attachments.length,
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
