/** Пишет типы канбана в справочник наряда (Prisma), не в Kaiten API. */

export type KanbanCatalogCardTypeRow = {
  id: string;
  name: string;
  sortOrder: number;
};

export async function persistKanbanCatalogCardTypes(
  types: Array<{ id?: string | null; name?: string | null; sortOrder?: number | null }>,
): Promise<KanbanCatalogCardTypeRow[] | null> {
  const rows = types
    .map((t) => ({
      id: String(t.id || "").trim(),
      name: String(t.name || "").trim(),
      sortOrder:
        t.sortOrder != null && Number.isFinite(t.sortOrder) ? Number(t.sortOrder) : 0,
    }))
    .filter((t) => t.name && t.name !== "Новый тип");
  if (rows.length === 0) return [];
  try {
    const res = await fetch("/api/kanban/card-types", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ types: rows }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { types?: KanbanCatalogCardTypeRow[] };
    return Array.isArray(data.types) ? data.types : null;
  } catch {
    return null;
  }
}
