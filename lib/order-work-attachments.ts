/**
 * Рабочие вложения наряда — заказ, чат, канбан.
 * Сканы книжного сканера здесь видны; в Kaiten их не пушим (sticker hub).
 * Без счёта и платёжки.
 */
import { OrderAttachmentScope } from "@prisma/client";

export function isOrderWorkAttachment(
  row: { id: string; scope: OrderAttachmentScope },
  invoiceAttachmentId: string | null,
): boolean {
  if (row.scope === OrderAttachmentScope.PAYMENT_SLIP) return false;
  if (invoiceAttachmentId && row.id === invoiceAttachmentId) return false;
  return true;
}

export type OrderWorkAttachmentRow = {
  id: string;
  fileName: string;
  mimeType: string | null;
  size: number;
  createdAt: Date | string;
};

/** Как isCardFileImage, без импорта card-files (цикл с model). */
export function orderAttachmentLooksLikeImage(row: {
  mimeType?: string | null;
  fileName?: string | null;
}): boolean {
  const mime = String(row.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const n = String(row.fileName || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(n);
}

export function orderWorkAttachmentToChatImage(
  orderId: string,
  a: OrderWorkAttachmentRow,
): { id: string; name: string; url: string; mime: string | null } | null {
  if (!orderAttachmentLooksLikeImage(a)) return null;
  return {
    id: `oa-${a.id}`,
    name: a.fileName,
    url: `/api/orders/${orderId}/attachments/${a.id}`,
    mime: a.mimeType || "application/octet-stream",
  };
}
