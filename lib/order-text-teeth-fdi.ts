import {
  isValidFdi,
  LOWER_FDI_ROW,
  PRIMARY_LOWER_FDI_ROW,
  PRIMARY_UPPER_FDI_ROW,
  UPPER_FDI_ROW,
} from "@/lib/fdi-teeth";
import type { CompositionHint } from "@/lib/llm/resolve-ai-composition-lines";

/** JS `\b` не считает кириллицу «словом» — явные границы букв/цифр. */
const WORD_LEFT = String.raw`(?<![\p{L}\p{N}])`;
const WORD_RIGHT = String.raw`(?![\p{L}\p{N}])`;
/** `\w` не матчит кириллицу — только `\p{L}`. */
const CYR_WORD_TAIL = String.raw`\p{L}*`;

const TWO_DIGIT_FDI_RE = new RegExp(`${WORD_LEFT}(\\d{2})${WORD_RIGHT}`, "gu");

/** Диапазон зубов лаб-стенографии: «12-22», «12–22». */
const FDI_RANGE_RE = new RegExp(
  `${WORD_LEFT}(\\d{2})\\s*[-–—]\\s*(\\d{2})${WORD_RIGHT}`,
  "gu",
);

/** Фрагменты даты вроде 25.07.2026 или 25\07\2026 — не путать с FDI. */
const DATE_FRAGMENT_RE = /\d{1,2}[./\\]\d{1,2}(?:[./\\]\d{2,4})?/g;

const SUPPORT_TEETH_CONTEXT_RE = new RegExp(
  `(?:${WORD_LEFT}(?:опор${CYR_WORD_TAIL}|лапк${CYR_WORD_TAIL})${WORD_RIGHT}[^\\n]{0,80}?${WORD_LEFT}на${WORD_RIGHT}\\s*)([0-9][0-9\\s,;]+)`,
  "giu",
);

const TOOTH_WORD_CONTEXT_RE = new RegExp(
  `${WORD_LEFT}(?:зуб|зубы|зуба)${WORD_RIGHT}\\s*([0-9][0-9\\s,;/]+)`,
  "giu",
);

const WORK_TYPE_LINE_RE = new RegExp(
  `${WORD_LEFT}вид\\s+работ${CYR_WORD_TAIL}${WORD_RIGHT}\\s*[:：]?\\s*([^\\n]+)`,
  "iu",
);

function dateExcludeRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(DATE_FRAGMENT_RE)) {
    if (match.index == null) continue;
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

function isInsideRanges(index: number, ranges: Array<{ start: number; end: number }>): boolean {
  return ranges.some((range) => index >= range.start && index < range.end);
}

/** Разворачивает «12-22» → 12,11,21,22 по ряду схемы. */
export function expandFdiToothRange(fromCode: string, toCode: string): string[] | null {
  const a = String(fromCode || "").trim();
  const b = String(toCode || "").trim();
  if (!isValidFdi(a) || !isValidFdi(b)) return null;
  for (const row of [
    UPPER_FDI_ROW,
    LOWER_FDI_ROW,
    PRIMARY_UPPER_FDI_ROW,
    PRIMARY_LOWER_FDI_ROW,
  ]) {
    const i = row.indexOf(a);
    const j = row.indexOf(b);
    if (i < 0 || j < 0) continue;
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    // Не разворачиваем почти всю челюсть (защита от мусора).
    if (hi - lo > 8) return null;
    return [...row.slice(lo, hi + 1)];
  }
  return null;
}

function extractValidFdiFromFragment(
  fragment: string,
  opts?: { fullText?: string; fragmentStart?: number },
): string[] {
  const fullText = opts?.fullText ?? fragment;
  const fragmentStart = opts?.fragmentStart ?? 0;
  const dateRanges = dateExcludeRanges(fullText);
  const teeth: string[] = [];
  const seen = new Set<string>();

  const add = (code: string) => {
    if (!isValidFdi(code) || seen.has(code)) return;
    seen.add(code);
    teeth.push(code);
  };

  // Сначала диапазоны — иначе «12-22» даст только 12 и 22.
  for (const match of fragment.matchAll(FDI_RANGE_RE)) {
    if (match.index == null) continue;
    const absIndex = fragmentStart + match.index;
    if (isInsideRanges(absIndex, dateRanges)) continue;
    const expanded = expandFdiToothRange(match[1]!, match[2]!);
    if (expanded) {
      for (const code of expanded) add(code);
    }
  }

  for (const match of fragment.matchAll(TWO_DIGIT_FDI_RE)) {
    if (match.index == null) continue;
    const absIndex = fragmentStart + match.index;
    if (isInsideRanges(absIndex, dateRanges)) continue;
    add(match[1]!);
  }

  return teeth;
}

function collectContextFragments(orderText: string): string[] {
  const fragments: string[] = [];

  const workLine = WORK_TYPE_LINE_RE.exec(orderText);
  if (workLine?.[1]?.trim()) {
    fragments.push(workLine[1].trim());
  }

  for (const re of [SUPPORT_TEETH_CONTEXT_RE, TOOTH_WORD_CONTEXT_RE]) {
    re.lastIndex = 0;
    for (const match of orderText.matchAll(re)) {
      const captured = match[1]?.trim() ?? "";
      if (captured) fragments.push(captured);
    }
  }

  return fragments;
}

/** Извлекает номера зубов FDI из текста заказа (опора/лапки/зубы/вид работы), без дат. */
export function extractTeethFdiFromOrderText(orderText: string): string[] {
  const text = orderText.trim();
  if (!text) return [];

  const contextual = collectContextFragments(text);
  if (contextual.length > 0) {
    const merged: string[] = [];
    const seen = new Set<string>();
    let offset = 0;
    for (const fragment of contextual) {
      const start = text.indexOf(fragment, offset);
      const foundStart = start >= 0 ? start : 0;
      for (const code of extractValidFdiFromFragment(fragment, {
        fullText: text,
        fragmentStart: foundStart,
      })) {
        if (seen.has(code)) continue;
        seen.add(code);
        merged.push(code);
      }
      offset = foundStart + fragment.length;
    }
    // Если в «Вид работы» мало зубов — дополняем из всего текста (диапазоны + одиночные).
    if (merged.length < 2) {
      for (const code of extractValidFdiFromFragment(text, {
        fullText: text,
        fragmentStart: 0,
      })) {
        if (seen.has(code)) continue;
        seen.add(code);
        merged.push(code);
      }
    }
    // Порядок как в тексте / развороте диапазона — не sortTeethFdi (молочные 55…53).
    return merged;
  }

  return extractValidFdiFromFragment(text, { fullText: text, fragmentStart: 0 });
}

const TOOTH_BEARING_HINT_RE =
  /аппарат|коронк|мост|винир|накладк|культ|абатмент|имплант|сплинт|элайнер|капп|вкладк|немедленн|винтов|пмма|pmma|основан/i;

const PER_TOOTH_QTY_HINT_RE =
  /коронк|немедленн|винир|накладк|основан|абатмент|временн|винтов|пмма|pmma/i;

/** Подставляет teethFdi и quantity в hints, если ИИ/эвристика их не заполнили. */
export function enrichCompositionHintsWithTeethFdi(
  hints: CompositionHint[],
  orderText: string,
): CompositionHint[] {
  if (!orderText.trim() || hints.length === 0) return hints;

  const teeth = extractTeethFdiFromOrderText(orderText);
  if (teeth.length === 0) return hints;

  const applyTeethAndQty = (hint: CompositionHint): CompositionHint => {
    const next: CompositionHint = { ...hint };
    if (!next.teethFdi?.length) next.teethFdi = teeth;
    const toothCount = next.teethFdi?.length ?? 0;
    if (
      toothCount > 1 &&
      PER_TOOTH_QTY_HINT_RE.test(next.nameHint) &&
      (next.quantity == null || next.quantity === 1)
    ) {
      next.quantity = toothCount;
    }
    return next;
  };

  if (hints.length === 1) {
    return [applyTeethAndQty(hints[0]!)];
  }

  return hints.map((hint) => {
    if (!TOOTH_BEARING_HINT_RE.test(hint.nameHint)) return hint;
    return applyTeethAndQty(hint);
  });
}
