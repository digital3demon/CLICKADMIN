/**
 * Клиент-безопасные утилиты для запроса «разблокировать в Kaiten» (без Prisma / server-only).
 * Серверная логика — в `apply-kaiten-unblock-from-list-tag.ts`.
 */

/**
 * Метка запроса «разблокировать в Kaiten»: в тексте есть это слово — POST list-tags
 * не создаёт тег, только пытается снять блокировку карточки (если наряд был заблокирован).
 */
export function customListTagLabelMeansKaitenUnblock(label: string): boolean {
  return label.toLocaleLowerCase("ru-RU").includes("разблокировать");
}

export type KaitenUnblockFromListTagResult =
  | { kind: "skipped"; reason: "not_blocked" | "no_card" | "kaiten_not_configured" }
  | { kind: "done" }
  | { kind: "error"; message: string };
