import { OrderAttachmentScope } from "@prisma/client";

/** Счета и платёжки не дублируются в Kaiten. Сканы книжного сканера — да. */
export function isOrderAttachmentEligibleForKaitenPush(row: {
  id: string;
  scope: OrderAttachmentScope;
  order: { invoiceAttachmentId: string | null };
}): boolean {
  if (row.scope === OrderAttachmentScope.PAYMENT_SLIP) return false;
  if (row.order.invoiceAttachmentId === row.id) return false;
  return true;
}
