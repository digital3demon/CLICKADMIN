/**
 * Человекочитаемые ошибки Kaiten API (сырой SQL/JSON не показываем в UI).
 */
export function friendlyKaitenApiErrorText(
  status: number,
  raw: string | null | undefined,
  fallback: string,
  opts?: { rateLimited?: boolean },
): string {
  if (opts?.rateLimited) {
    return "Слишком много запросов к Kaiten. Подождите 1–2 минуты и обновите страницу.";
  }
  let text = raw?.trim() || "";
  if (text.startsWith("{")) {
    try {
      const j = JSON.parse(text) as { message?: unknown; error?: unknown };
      const msg =
        typeof j.message === "string"
          ? j.message
          : typeof j.error === "string"
            ? j.error
            : "";
      if (msg.trim()) text = msg.trim();
    } catch {
      /* leave raw */
    }
  }
  if (/Position inconsistency/i.test(text)) {
    return "Kaiten: колонка и дорожка не относятся к одной доске. Выберите дорожку из списка или снова откройте пространство и сохраните.";
  }
  if (/not allowed to change a due date of completed cards/i.test(text)) {
    return "В Kaiten у завершённой карточки нельзя менять срок. Верните карточку из Done или снимите срок только в CRM.";
  }
  if (/card_update_\d+|select \* from/i.test(text)) {
    return fallback;
  }
  void status;
  return text || fallback;
}
