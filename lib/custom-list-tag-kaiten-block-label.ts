/**
 * Метка «заблокировать в Kaiten» из модалки тегов списка заказов (без Prisma).
 * Сервер: `apply-kaiten-block-from-list-tag.ts`.
 */

export function customListTagLabelMeansKaitenBlock(label: string): boolean {
  const n = label.trim().toLocaleLowerCase("ru-RU");
  if (n.includes("разблокировать")) return false;
  return n.includes("заблокировать");
}

export type KaitenBlockFromListTagResult =
  | {
      kind: "skipped";
      reason: "already_blocked" | "no_card" | "kaiten_not_configured";
    }
  | { kind: "done" }
  | { kind: "error"; message: string };
