import "server-only";
import type { PrismaClient } from "@prisma/client";
import { cleanMailTextBody, mailHtmlToText } from "@/lib/mail/mail-text-cleanup";
import { mergeEmailAttachmentsWithYandexDisk } from "@/lib/mail/yandex-disk-mail-attachments";

export type OrderSourceEmailRow = {
  id: string;
  subject: string | null;
  fromName: string | null;
  fromAddress: string | null;
  direction: "INBOUND" | "OUTBOUND";
  receivedAt: string | null;
  sentAt: string | null;
  preview: string | null;
  textBody: string | null;
  isReplyTarget: boolean;
  autoReplySentAt: string | null;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    /** Яндекс.Диск / внешняя ссылка; null|undefined — обычное MIME-вложение. */
    externalUrl?: string | null;
  }>;
};

export function orderSourceEmailBodyText(input: {
  textBody: string | null;
  htmlBody: string | null;
  preview: string | null;
}): string {
  return (
    cleanMailTextBody(input.textBody) ||
    mailHtmlToText(input.htmlBody) ||
    cleanMailTextBody(input.preview) ||
    "В письме нет текстового содержимого."
  );
}

export async function fetchOrderSourceEmails(
  db: PrismaClient,
  tenantId: string,
  orderId: string,
): Promise<OrderSourceEmailRow[]> {
  const links = await db.emailSourceOrder.findMany({
    where: { tenantId, orderId },
    orderBy: { createdAt: "asc" },
    select: {
      isReplyTarget: true,
      autoReplySentAt: true,
      email: {
        select: {
          id: true,
          subject: true,
          fromName: true,
          fromAddress: true,
          receivedAt: true,
          sentAt: true,
          preview: true,
          textBody: true,
          htmlBody: true,
          attachments: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              size: true,
            },
            orderBy: { fileName: "asc" },
          },
        },
      },
    },
  });

  return links.map((link) => ({
    id: link.email.id,
    subject: link.email.subject,
    fromName: link.email.fromName,
    fromAddress: link.email.fromAddress,
    direction: link.email.direction,
    receivedAt: link.email.receivedAt?.toISOString() ?? null,
    sentAt: link.email.sentAt?.toISOString() ?? null,
    preview: link.email.preview,
    textBody: orderSourceEmailBodyText(link.email),
    isReplyTarget: link.isReplyTarget,
    autoReplySentAt: link.autoReplySentAt?.toISOString() ?? null,
    attachments: mergeEmailAttachmentsWithYandexDisk(link.email.attachments, {
      textBody: link.email.textBody,
      htmlBody: link.email.htmlBody,
    }),
  }));
}
