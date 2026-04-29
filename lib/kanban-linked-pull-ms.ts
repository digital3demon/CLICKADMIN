/** Интервал подтягивания нарядов с сервера на доску канбана (мс). */
export function kanbanLinkedOrdersPullIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_KANBAN_LINKED_PULL_MS;
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 8000;
  if (!Number.isFinite(n)) return 8000;
  return Math.min(Math.max(n, 4000), 120_000);
}
