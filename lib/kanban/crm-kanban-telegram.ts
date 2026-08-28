/**
 * Раньше CRM молчала, если у карточки был kaitenCardId (думали, что пушит Kaiten).
 * Упоминания шли отдельно — поэтому в боте жило только «вас упомянули».
 * Бота CRM и Kaiten не смешиваем: галочки профиля шлют события CRM всегда.
 */
export function shouldSkipCrmKanbanTelegram(
  _kaitenCardId?: number | null,
): boolean {
  return false;
}
