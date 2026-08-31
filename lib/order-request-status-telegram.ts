/**
 * Текст ТГ по статусу заявки «!!!» / «???».
 * Не про состав наряда и не про склад.
 * Протетика: принят → отклонён → в пути → на базе. «Проверена» / «готово» в ТГ не пишем.
 */

export type OrderRequestTelegramKind = "correction" | "prosthetics";

export type OrderRequestTelegramStatus =
  | "accepted"
  | "rejected"
  | "clarify"
  | "ordered"
  | "arrived"
  | "checked"
  | "completed";

export function orderRequestStatusTelegramPhrase(
  kind: OrderRequestTelegramKind,
  status: OrderRequestTelegramStatus,
): string | null {
  if (kind === "correction") {
    if (status === "accepted") return "Корректировку подтвердили";
    if (status === "rejected") return "В корректировке отказано";
    if (status === "clarify") return "Есть вопрос по корректировке";
    return null;
  }
  switch (status) {
    case "accepted":
      return "Заказ на протетику принят";
    case "rejected":
      return "Заказ на протетику отклонен";
    case "ordered":
      return "Протетика в пути";
    case "arrived":
      return "Протетика на базе";
    case "checked":
    case "completed":
      return null;
    default:
      return null;
  }
}
