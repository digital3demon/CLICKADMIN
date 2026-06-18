export const ORDER_REVISION_KIND_RU: Record<string, string> = {
  CREATE: "Создание",
  SAVE: "Сохранение",
  RESTORE: "Восстановление",
};

export const CONTRACTOR_REVISION_KIND_RU: Record<string, string> = {
  CREATE: "Создание",
  UPDATE: "Сохранение",
  DELETE: "Удаление",
  RESTORE: "Восстановление",
};

export type RevisionsHistoryOrderRow = {
  id: string;
  createdAt: Date;
  actorLabel: string;
  summary: string;
  kind: string;
  order: { id: string; orderNumber: string };
};

export type RevisionsHistoryContractorRow = {
  id: string;
  createdAt: Date;
  actorLabel: string;
  summary: string;
  kind: string;
  clinic: { id: string; name: string } | null;
  doctor: { id: string; fullName: string } | null;
};

export type RevisionsHistoryItem =
  | { t: "order"; at: number; row: RevisionsHistoryOrderRow }
  | { t: "contractor"; at: number; row: RevisionsHistoryContractorRow };

/** Нормализация строки поиска (URL `q`). */
export function normalizeRevisionsHistorySearchQuery(
  raw: string | null | undefined,
): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function mergeRevisionsHistoryRows(
  orderRows: RevisionsHistoryOrderRow[],
  contractorRows: RevisionsHistoryContractorRow[],
  limit: number,
): RevisionsHistoryItem[] {
  const items: RevisionsHistoryItem[] = [
    ...orderRows.map((r) => ({
      t: "order" as const,
      at: r.createdAt.getTime(),
      row: r,
    })),
    ...contractorRows.map((r) => ({
      t: "contractor" as const,
      at: r.createdAt.getTime(),
      row: r,
    })),
  ];
  items.sort((a, b) => b.at - a.at);
  return items.slice(0, limit);
}

export function revisionsHistoryHref(q?: string | null): string {
  const query = normalizeRevisionsHistorySearchQuery(q);
  if (!query) return "/orders/history";
  const p = new URLSearchParams();
  p.set("q", query);
  return `/orders/history?${p.toString()}`;
}
