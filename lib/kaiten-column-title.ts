/** Нормализация для сопоставления названий колонок CRM-канбана и Kaiten. */
export function normalizeKanbanColumnTitle(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Находит id колонки Kaiten по названию (как у колонки на доске-зеркале в CRM).
 */
export function findKaitenColumnIdByTitle(
  columns: Array<{ id: number; title?: string; name?: string }>,
  desiredTitle: string,
): number | null {
  const want = normalizeKanbanColumnTitle(desiredTitle);
  if (!want) return null;
  const rows = columns.map((c) => ({
    id: c.id,
    label: normalizeKanbanColumnTitle(String(c.title ?? c.name ?? "")),
  }));
  const exact = rows.find((x) => x.label === want);
  if (exact) return exact.id;
  const prefix = rows.find(
    (x) =>
      x.label.length > 0 &&
      (x.label.startsWith(want) || want.startsWith(x.label)),
  );
  if (prefix) return prefix.id;
  const substr = rows.find(
    (x) =>
      x.label.length >= 4 &&
      want.length >= 4 &&
      (x.label.includes(want) || want.includes(x.label)),
  );
  return substr?.id ?? null;
}

/** Человекочитаемое имя колонки доски по id из карточки Kaiten. */
export function kaitenColumnTitleFromBoard(
  card: Record<string, unknown>,
  columns: Array<{ id: number; title?: string; name?: string }>,
): string | null {
  const colId = card.column_id;
  if (typeof colId !== "number" || !Number.isFinite(colId)) return null;
  const c = columns.find((x) => x.id === colId);
  if (!c) return null;
  const t = c.title ?? c.name;
  if (typeof t !== "string") return null;
  const s = t.trim();
  return s.length ? s : null;
}

const DEMO_KANBAN_COL_RU: Record<string, string> = {
  NEW: "Новые",
  IN_PROGRESS: "В работе",
  DONE: "Готово",
};

export function kaitenStatusDisplay(o: {
  kaitenColumnTitle: string | null;
  kaitenCardId: number | null;
  demoKanbanColumn?: string | null;
  demoCardTypeName?: string | null;
  /** Тип карточки (демо и бой — одно поле; demoCardTypeName оставлен для вызовов). */
  cardTypeName?: string | null;
}): string {
  const typeName = (o.cardTypeName ?? o.demoCardTypeName)?.trim();
  if (o.demoKanbanColumn) {
    const col =
      DEMO_KANBAN_COL_RU[String(o.demoKanbanColumn)] ?? o.demoKanbanColumn;
    return typeName ? `${col} · ${typeName}` : col;
  }
  const t = o.kaitenColumnTitle?.trim();
  if (t) return typeName ? `${t} · ${typeName}` : t;
  if (o.kaitenCardId != null) return typeName ? `— · ${typeName}` : "—";
  return "Нет в Kaiten";
}

/** Подпись доски под статусом в списке нарядов (ортопедия / ортодонтия / тест). */
export function kaitenTrackLaneListLabel(
  lane: string | null | undefined,
): string | null {
  const u = String(lane || "").trim().toUpperCase();
  if (u === "ORTHODONTICS") return "Ортодонтия";
  if (u === "ORTHOPEDICS") return "Ортопедия";
  if (u === "TEST") return "Тест";
  return null;
}
