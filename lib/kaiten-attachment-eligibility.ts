import { OrderAttachmentScope } from "@prisma/client";

/** Счета, платёжки и сканы книжного сканера не дублируются в Kaiten. */
export function isOrderAttachmentEligibleForKaitenPush(row: {
  id: string;
  scope: OrderAttachmentScope;
  order: { invoiceAttachmentId: string | null };
}): boolean {
  if (row.scope === OrderAttachmentScope.PAYMENT_SLIP) return false;
  if (row.scope === OrderAttachmentScope.SCANNER) return false;
  if (row.order.invoiceAttachmentId === row.id) return false;
  return true;
}
