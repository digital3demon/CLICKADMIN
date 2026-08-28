/**
 * Текст ТГ по статусу заявки «!!!» / «???».
 * Не про состав наряда и не про склад.
 */

export type OrderRequestTelegramKind = "correction" | "prosthetics";

export type OrderRequestTelegramStatus =
  | "accepted"
  | "rejected"
  | "ordered"
  | "arrived"
  | "checked"
  | "completed";

export function orderRequestStatusTelegramPhrase(
  kind: OrderRequestTelegramKind,
  status: OrderRequestTelegramStatus,
): string {
  if (kind === "correction") {
    if (status === "accepted") return "корректировка: принята";
    if (status === "rejected") return "корректировка: отказ";
    return "корректировка: обновлён статус";
  }
  switch (status) {
    case "accepted":
      return "протетика: принята";
    case "rejected":
      return "протетика: отказ";
    case "ordered":
      return "протетика: в пути";
    case "arrived":
      return "протетика: приехала";
    case "checked":
      return "протетика: проверена";
    case "completed":
      return "протетика: готово";
    default:
      return "протетика: обновлён статус";
  }
}
