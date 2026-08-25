export type DocumentMailThreadRow = {
  id: string;
  direction: "INBOUND" | "OUTBOUND" | "DRAFT";
  threadId?: string | null;
};

/**
 * Переписка по документам: только исходящие «отправить документы» / ответы
 * и входящие в той же ветке. Письмо-источник заказа не входит.
 */
export function filterOrderDocumentMailEmails<T extends DocumentMailThreadRow>(
  rows: T[],
): T[] {
  const outbound = rows.filter((e) => e.direction === "OUTBOUND");
  if (outbound.length === 0) return [];
  const threads = new Set(
    outbound
      .map((e) => e.threadId?.trim())
      .filter((id): id is string => Boolean(id)),
  );
  return rows.filter((e) => {
    if (e.direction === "OUTBOUND") return true;
    if (e.direction !== "INBOUND") return false;
    const tid = e.threadId?.trim();
    return Boolean(tid && threads.has(tid));
  });
}
