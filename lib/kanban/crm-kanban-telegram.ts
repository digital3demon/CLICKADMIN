/**
 * CRM-канбан и Telegram: если карточка привязана к Kaiten (есть числовой kaitenCardId),
 * дубли из CRM не шлём — уведомления идут из цепочки Kaiten/наряда.
 */
export function shouldSkipCrmKanbanTelegram(
  kaitenCardId: number | null | undefined,
): boolean {
  return kaitenCardId != null && Number.isFinite(kaitenCardId);
}
