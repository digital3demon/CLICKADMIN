/**
 * Персональная раскладка блоков формы редактирования наряда (страница заказа).
 * Локальный runtime-кеш; постоянное хранение делает серверный client-state слой.
 */

export const ORDER_EDIT_LAYOUT_STORAGE_KEY = "dental-lab.orderEditLayout.v1";
const layoutMemory = new Map<string, OrderEditLayoutV1>();

export type OrderEditBlockId =
  | "topCustomer"
  | "topDeadlines"
  | "topFiles"
  | "topClientNotes"
  | "midConstructions"
  | "midCorrections"
  | "midProsthetics"
  | "bottomSecondary";

export type OrderEditRowBlock = {
  id: OrderEditBlockId;
  /** Доля в сетке 12 колонок (сумма по строке = 12) */
  span: number;
};

export type OrderEditLayoutV1 = {
  v: 1;
  row1: OrderEditRowBlock[];
  row2: OrderEditRowBlock[];
  /** Средний ряд под составом: по умолчанию только «Протетика» на 6 кол. */
  row3: OrderEditRowBlock[];
  /** Нижний ряд (вкладки «Документооборот» и т.д.) — по умолчанию на всю ширину. */
  row4: OrderEditRowBlock[];
  /** HEX, например #e8f4fc или пусто = тема по умолчанию */
  blockColors: Partial<Record<OrderEditBlockId, string>>;
};

export const ORDER_EDIT_BLOCK_IDS: OrderEditBlockId[] = [
  "topCustomer",
  "topDeadlines",
  "topFiles",
  "topClientNotes",
  "midConstructions",
  "midCorrections",
  "midProsthetics",
  "bottomSecondary",
];

/** Средний ряд: состав 6 + корректировки 6; протетика под составом (6 кол.); низ на всю ширину. */
export function defaultOrderEditLayout(): OrderEditLayoutV1 {
  return {
    v: 1,
    row1: [
      { id: "topCustomer", span: 3 },
      { id: "topDeadlines", span: 3 },
      { id: "topFiles", span: 3 },
      { id: "topClientNotes", span: 3 },
    ],
    row2: [
      { id: "midConstructions", span: 6 },
      { id: "midCorrections", span: 6 },
    ],
    row3: [{ id: "midProsthetics", span: 6 }],
    row4: [{ id: "bottomSecondary", span: 12 }],
    blockColors: {},
  };
}

function cloneLayout(l: OrderEditLayoutV1): OrderEditLayoutV1 {
  return {
    v: 1,
    row1: l.row1.map((b) => ({ ...b })),
    row2: l.row2.map((b) => ({ ...b })),
    row3: l.row3.map((b) => ({ ...b })),
    row4: l.row4.map((b) => ({ ...b })),
    blockColors: { ...l.blockColors },
  };
}

function validateBlockId(x: unknown): x is OrderEditBlockId {
  return typeof x === "string" && (ORDER_EDIT_BLOCK_IDS as string[]).includes(x);
}

function parseRow(raw: unknown): OrderEditRowBlock[] | null {
  if (!Array.isArray(raw)) return null;
  const out: OrderEditRowBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    if (!validateBlockId(o.id)) return null;
    const span = Number(o.span);
    if (!Number.isFinite(span) || span < 1 || span > 12) return null;
    out.push({ id: o.id, span: Math.round(span) });
  }
  return out;
}

function rowSpanSum(row: OrderEditRowBlock[]): number {
  return row.reduce((s, b) => s + b.span, 0);
}

/** Ряд только с «Протетика» на половину сетки (под «Состав заказа»). */
function isProstheticsHalfRow(row: OrderEditRowBlock[]): boolean {
  return (
    row.length === 1 &&
    row[0]!.id === "midProsthetics" &&
    row[0]!.span === 6 &&
    rowSpanSum(row) === 6
  );
}

function row3IsValid(row: OrderEditRowBlock[]): boolean {
  return rowSpanSum(row) === 12 || isProstheticsHalfRow(row);
}

/** После rebalanceRow одна «Протетика» получала бы span 12 — возвращаем половину сетки. */
function fixMonoProstheticsRow3(next: OrderEditLayoutV1): void {
  if (next.row3.length === 1 && next.row3[0]!.id === "midProsthetics") {
    next.row3[0] = { ...next.row3[0]!, span: 6 };
  }
}

const COLOR_HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;

/** Раскладка с midRightStack (промежуточная версия) → три колонки в одном ряду 6+3+3 (потом миграция в 4 ряда). */
function coerceLayoutV1MidRightStack(
  o: Record<string, unknown>,
): Record<string, unknown> {
  const r2 = o.row2;
  if (!Array.isArray(r2)) return o;
  const hasStack = r2.some(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as Record<string, unknown>).id === "midRightStack",
  );
  if (!hasStack) return o;

  const defRow2 = defaultOrderEditLayout().row2;
  const next: Record<string, unknown> = { ...o };
  const cells = r2.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object",
  );
  const cons = cells.find((c) => c.id === "midConstructions");
  const stack = cells.find((c) => c.id === "midRightStack");
  if (!cons || !stack || cells.length !== 2) {
    next.row2 = defRow2.map((b) => ({ ...b }));
  } else {
    const stackSpan = Math.min(10, Math.max(2, Math.round(Number(stack.span)) || 4));
    const cor = Math.max(2, Math.floor(stackSpan / 2));
    const pro = Math.max(2, stackSpan - cor);
    const conSpan = 12 - cor - pro;
    next.row2 = [
      { id: "midConstructions", span: conSpan },
      { id: "midCorrections", span: cor },
      { id: "midProsthetics", span: pro },
    ];
  }

  const rawBc = o.blockColors;
  const bc: Record<string, unknown> =
    rawBc && typeof rawBc === "object"
      ? { ...(rawBc as Record<string, unknown>) }
      : {};
  const stackCol = bc.midRightStack;
  if (typeof stackCol === "string" && COLOR_HEX.test(stackCol)) {
    if (
      typeof bc.midCorrections !== "string" ||
      !COLOR_HEX.test(bc.midCorrections)
    ) {
      bc.midCorrections = stackCol;
    }
    if (
      typeof bc.midProsthetics !== "string" ||
      !COLOR_HEX.test(bc.midProsthetics)
    ) {
      bc.midProsthetics = stackCol;
    }
  }
  delete bc.midRightStack;
  next.blockColors = bc;
  return next;
}

/** После перестановки выравниваем доли в строке (как «под соседей»). */
export function rebalanceRow(row: OrderEditRowBlock[]): OrderEditRowBlock[] {
  const n = row.length;
  if (n === 0) return [];
  const base = Math.floor(12 / n);
  let rem = 12 - base * n;
  return row.map((b, i) => ({
    ...b,
    span: base + (i < rem ? 1 : 0),
  }));
}

/**
 * Старый JSON (3 ряда): row2 = состав + корр. + протетика, row3 = низ.
 * Новый формат: row2 = состав + корр.; row3 = протетика (6); row4 = низ.
 */
function migrateLegacyThreeRowLayout(
  r1: OrderEditRowBlock[],
  r2: OrderEditRowBlock[],
  r3: OrderEditRowBlock[],
): { row2: OrderEditRowBlock[]; row3: OrderEditRowBlock[]; row4: OrderEditRowBlock[] } | null {
  if (rowSpanSum(r1) !== 12) return null;
  if (rowSpanSum(r3) !== 12 || r3.length !== 1 || r3[0]!.id !== "bottomSecondary")
    return null;
  const pro = r2.find((b) => b.id === "midProsthetics");
  const rest = r2.filter((b) => b.id !== "midProsthetics");
  if (!pro || rest.length < 1 || rowSpanSum(r2) !== 12) return null;
  const row2 = rebalanceRow(rest);
  return {
    row2,
    row3: [{ id: "midProsthetics", span: 6 }],
    row4: [{ ...r3[0]! }],
  };
}

export function normalizeLayout(input: unknown): OrderEditLayoutV1 {
  const def = defaultOrderEditLayout();
  if (!input || typeof input !== "object") return def;
  let o = input as Record<string, unknown>;
  if (o.v !== 1) return def;
  o = coerceLayoutV1MidRightStack(o);
  const r1 = parseRow(o.row1);
  let r2 = parseRow(o.row2);
  let r3 = parseRow(o.row3);
  let r4 = parseRow(o.row4);
  if (!r1 || !r2 || !r3) return def;

  if (!r4 || r4.length === 0) {
    const migrated = migrateLegacyThreeRowLayout(r1, r2, r3);
    if (migrated) {
      r2 = migrated.row2;
      r3 = migrated.row3;
      r4 = migrated.row4;
    }
  }

  if (!r4 || r4.length === 0) return def;
  if (rowSpanSum(r1) !== 12 || rowSpanSum(r2) !== 12) return def;
  if (!row3IsValid(r3) || rowSpanSum(r4) !== 12) return def;

  const seen = new Set<OrderEditBlockId>();
  const all = [...r1, ...r2, ...r3, ...r4];
  for (const b of all) {
    if (seen.has(b.id)) return def;
    seen.add(b.id);
  }
  for (const id of ORDER_EDIT_BLOCK_IDS) {
    if (!seen.has(id)) return def;
  }
  let blockColors: Partial<Record<OrderEditBlockId, string>> = {};
  if (o.blockColors && typeof o.blockColors === "object") {
    const bc = o.blockColors as Record<string, unknown>;
    for (const id of ORDER_EDIT_BLOCK_IDS) {
      const v = bc[id];
      if (typeof v === "string" && COLOR_HEX.test(v)) {
        blockColors[id] = v;
      }
    }
  }
  return { v: 1, row1: r1, row2: r2, row3: r3, row4: r4, blockColors };
}

export function storageKeyForUser(userId: string | null): string {
  const key = userId?.trim() || "guest";
  return `${ORDER_EDIT_LAYOUT_STORAGE_KEY}:${key}`;
}

export function loadOrderEditLayout(userId: string | null): OrderEditLayoutV1 {
  const key = storageKeyForUser(userId);
  return layoutMemory.get(key) ?? defaultOrderEditLayout();
}

export function saveOrderEditLayout(
  userId: string | null,
  layout: OrderEditLayoutV1,
): void {
  const key = storageKeyForUser(userId);
  layoutMemory.set(key, normalizeLayout(layout));
}

export function clearOrderEditLayout(userId: string | null): void {
  const key = storageKeyForUser(userId);
  layoutMemory.delete(key);
}

export type OrderEditRowKey = "row1" | "row2" | "row3" | "row4";

export function findBlockRow(
  layout: OrderEditLayoutV1,
  id: OrderEditBlockId,
): OrderEditRowKey | null {
  if (layout.row1.some((b) => b.id === id)) return "row1";
  if (layout.row2.some((b) => b.id === id)) return "row2";
  if (layout.row3.some((b) => b.id === id)) return "row3";
  if (layout.row4.some((b) => b.id === id)) return "row4";
  return null;
}

/** Переставить блок перед другим в той же строке и выровнять span. */
export function reorderWithinRow(
  layout: OrderEditLayoutV1,
  rowKey: OrderEditRowKey,
  draggedId: OrderEditBlockId,
  beforeId: OrderEditBlockId | null,
): OrderEditLayoutV1 {
  const next = cloneLayout(layout);
  const row = next[rowKey];
  const from = row.findIndex((b) => b.id === draggedId);
  if (from < 0) return layout;
  const [item] = row.splice(from, 1);
  if (!item) return layout;
  if (beforeId == null) {
    row.push(item);
  } else {
    const to = row.findIndex((b) => b.id === beforeId);
    if (to < 0) row.push(item);
    else row.splice(to, 0, item);
  }
  next[rowKey] = rebalanceRow(row);
  fixMonoProstheticsRow3(next);
  return next;
}

/** Перенести блок в другую строку перед указанным (или в конец). */
export function moveBlockToRow(
  layout: OrderEditLayoutV1,
  fromRow: OrderEditRowKey,
  toRow: OrderEditRowKey,
  draggedId: OrderEditBlockId,
  beforeId: OrderEditBlockId | null,
): OrderEditLayoutV1 {
  if (
    fromRow === "row3" &&
    layout.row3.length === 1 &&
    draggedId === "midProsthetics"
  ) {
    return layout;
  }
  if (
    fromRow === "row4" &&
    layout.row4.length === 1 &&
    draggedId === "bottomSecondary"
  ) {
    return layout;
  }
  if (fromRow === toRow) {
    return reorderWithinRow(layout, fromRow, draggedId, beforeId);
  }
  const next = cloneLayout(layout);
  const src = next[fromRow];
  const dst = next[toRow];
  const idx = src.findIndex((b) => b.id === draggedId);
  if (idx < 0) return layout;
  if (src.length <= 1) return layout;
  const [item] = src.splice(idx, 1);
  if (!item) return layout;
  if (beforeId == null) dst.push(item);
  else {
    const j = dst.findIndex((b) => b.id === beforeId);
    if (j < 0) dst.push(item);
    else dst.splice(j, 0, item);
  }
  next[fromRow] = rebalanceRow(src);
  next[toRow] = rebalanceRow(dst);
  fixMonoProstheticsRow3(next);
  return next;
}

/** Изменить границу между двумя соседними блоками: deltaCol положительный — вправо отдаём колонки слева направо. */
export function resizeBetweenBlocks(
  layout: OrderEditLayoutV1,
  rowKey: OrderEditRowKey,
  leftId: OrderEditBlockId,
  deltaCols: number,
): OrderEditLayoutV1 {
  if (deltaCols === 0) return layout;
  const next = cloneLayout(layout);
  const row = next[rowKey];
  const i = row.findIndex((b) => b.id === leftId);
  if (i < 0 || i >= row.length - 1) return layout;
  const left = row[i]!;
  const right = row[i + 1]!;
  const minSpan = 2;
  const d = Math.sign(deltaCols) * Math.min(Math.abs(deltaCols), 10);
  let newLeft = left.span + d;
  let newRight = right.span - d;
  if (newLeft < minSpan) {
    const fix = minSpan - newLeft;
    newLeft = minSpan;
    newRight = right.span - (d + fix);
  }
  if (newRight < minSpan) {
    const fix = minSpan - newRight;
    newRight = minSpan;
    newLeft = left.span + (d - fix);
  }
  if (newLeft < minSpan || newRight < minSpan) return layout;
  if (newLeft + newRight !== left.span + right.span) return layout;
  row[i] = { ...left, span: newLeft };
  row[i + 1] = { ...right, span: newRight };
  fixMonoProstheticsRow3(next);
  return next;
}

export function setBlockColor(
  layout: OrderEditLayoutV1,
  id: OrderEditBlockId,
  color: string | null,
): OrderEditLayoutV1 {
  const next = cloneLayout(layout);
  if (!color || !color.trim()) {
    delete next.blockColors[id];
    return next;
  }
  const c = color.trim();
  if (!/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(c)) return layout;
  next.blockColors[id] = c;
  return next;
}
