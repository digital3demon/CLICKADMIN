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
  /** false — только колонка (тип в списке нарядов вынесен в отдельную колонку). */
  includeCardType?: boolean;
}): string {
  const typeName =
    o.includeCardType === false
      ? ""
      : (o.cardTypeName ?? o.demoCardTypeName)?.trim();
  const colTitle = o.kaitenColumnTitle?.trim();
  if (colTitle) {
    return typeName ? `${colTitle} · ${typeName}` : colTitle;
  }
  if (o.demoKanbanColumn) {
    const col =
      DEMO_KANBAN_COL_RU[String(o.demoKanbanColumn)] ?? o.demoKanbanColumn;
    return typeName ? `${col} · ${typeName}` : col;
  }
  if (o.kaitenCardId != null) return typeName ? `— · ${typeName}` : "—";
  return "Нет в Kaiten";
}

/**
 * Сопоставление типа карточки: регистр, ё/е, лат. x / кир. х / ×.
 * `\b` не используем — кириллица для него не «слово».
 */
export function normalizeKaitenCardTypeName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .replace(/[×xх]/gi, "x");
}

/** Цвета как у типов канбана (`kaitenCardTypes`), ключ — normalizeKaitenCardTypeName. */
const KAITEN_CARD_TYPE_PILL_COLORS: Record<string, string> = {
  [normalizeKaitenCardTypeName("Временные")]: "#22c55e",
  [normalizeKaitenCardTypeName("МиоСплинт")]: "#06b6d4",
  [normalizeKaitenCardTypeName("Модели")]: "#92400e",
  [normalizeKaitenCardTypeName("Накладки")]: "#2563eb",
  [normalizeKaitenCardTypeName("Накладки МРТ")]: "#1f2937",
  [normalizeKaitenCardTypeName("ОртоАппараты")]: "#ec4899",
  [normalizeKaitenCardTypeName("ОртоАппараты x Хирургия")]: "#f97316",
  [normalizeKaitenCardTypeName("Постоянные")]: "#ef4444",
  [normalizeKaitenCardTypeName("Сплинт")]: "#3b82f6",
  [normalizeKaitenCardTypeName("Сплинт МРТ")]: "#171717",
  [normalizeKaitenCardTypeName("Хирургия")]: "#eab308",
};

export function kaitenCardTypePillColor(
  name: string | null | undefined,
): string | null {
  const key = normalizeKaitenCardTypeName(String(name || ""));
  if (!key) return null;
  return KAITEN_CARD_TYPE_PILL_COLORS[key] ?? null;
}

/** Длинная пилюля в списке нарядов: две строки, иначе заезжает в №. */
export const ORDER_STATUS_PILL_WRAP_AT = 20;

/**
 * Если вся подпись длиннее 20 символов — две строки.
 * Режем по « · » (колонка · тип); иначе по последнему пробелу до порога.
 * `\b` не используем: кириллица для него не «слово».
 */
export function splitOrderStatusPillLines(label: string): string[] {
  const t = label.trim();
  if (!t) return [""];
  if (t.length <= ORDER_STATUS_PILL_WRAP_AT) return [t];
  const sep = " · ";
  const sepAt = t.indexOf(sep);
  if (sepAt > 0) {
    const left = t.slice(0, sepAt).trim();
    const right = t.slice(sepAt + sep.length).trim();
    if (left && right) return [left, right];
  }
  const head = t.slice(0, ORDER_STATUS_PILL_WRAP_AT);
  const spaceAt = head.lastIndexOf(" ");
  if (spaceAt >= 4) {
    return [t.slice(0, spaceAt).trim(), t.slice(spaceAt).trim()];
  }
  return [
    t.slice(0, ORDER_STATUS_PILL_WRAP_AT),
    t.slice(ORDER_STATUS_PILL_WRAP_AT).trim(),
  ];
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
