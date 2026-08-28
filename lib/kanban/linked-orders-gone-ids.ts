/**
 * goneIds — только наряды, которых уже нет (удалён / архив / отмена).
 * «Не попал в выборку опроса» ≠ пропал: иначе карточка снимается с доски
 * и всплывает только после поиска.
 */
export function kanbanLinkedOrderGoneIds(input: {
  requestedIds: readonly string[];
  existing: ReadonlyArray<{
    id: string;
    archivedAt: Date | string | null;
    status: string;
  }>;
}): string[] {
  const byId = new Map(input.existing.map((row) => [row.id, row]));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input.requestedIds) {
    const id = String(raw || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const row = byId.get(id);
    if (!row || row.archivedAt || row.status === "CANCELLED") {
      out.push(id);
    }
  }
  return out;
}
