/**
 * Колонка CRM живёт на наряде (`kaitenColumnTitle`), не только в Kaiten.
 * После DnD пишем сразу — иначе F5 откатит карточку на старую плитку.
 */
export function crmColumnPersistFromLinkedMove(input: {
  linkedOrderId?: string | null;
  columnTitle?: string | null;
  sortOrder?: number | null;
  trackLane?: string | null;
}): { orderId: string; columnTitle: string; sortOrder?: number; trackLane?: string } | null {
  const orderId = String(input.linkedOrderId || "").trim();
  const columnTitle = String(input.columnTitle || "").trim();
  if (!orderId || !columnTitle) return null;
  const sort = input.sortOrder;
  const trackLane = String(input.trackLane || "").trim();
  return {
    orderId,
    columnTitle,
    ...(sort != null && Number.isFinite(sort) ? { sortOrder: sort } : {}),
    ...(trackLane ? { trackLane } : {}),
  };
}
