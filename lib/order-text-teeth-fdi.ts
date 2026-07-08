import { isValidFdi } from "@/lib/fdi-teeth";
import type { CompositionHint } from "@/lib/llm/resolve-ai-composition-lines";

/** JS `\b` не считает кириллицу «словом» — явные границы букв/цифр. */
const WORD_LEFT = String.raw`(?<![\p{L}\p{N}])`;
const WORD_RIGHT = String.raw`(?![\p{L}\p{N}])`;

const TWO_DIGIT_FDI_RE = new RegExp(`${WORD_LEFT}(\\d{2})${WORD_RIGHT}`, "gu");

/** Фрагменты даты вроде 25.07.2026 или 25\07\2026 — не путать с FDI. */
const DATE_FRAGMENT_RE = /\d{1,2}[./\\]\d{1,2}(?:[./\\]\d{2,4})?/g;

const SUPPORT_TEETH_CONTEXT_RE = new RegExp(
  `(?:${WORD_LEFT}(?:опор\\w*|лапк\\w*)${WORD_RIGHT}[^\\n]{0,80}?${WORD_LEFT}на${WORD_RIGHT}\\s*)([0-9][0-9\\s,;]+)`,
  "giu",
);

const TOOTH_WORD_CONTEXT_RE = new RegExp(
  `${WORD_LEFT}(?:зуб|зубы|зуба)${WORD_RIGHT}\\s*([0-9][0-9\\s,;/]+)`,
  "giu",
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

function extractValidFdiFromFragment(
  fragment: string,
  opts?: { fullText?: string; fragmentStart?: number },
): string[] {
  const fullText = opts?.fullText ?? fragment;
  const fragmentStart = opts?.fragmentStart ?? 0;
  const dateRanges = dateExcludeRanges(fullText);
  const teeth: string[] = [];
  const seen = new Set<string>();

  for (const match of fragment.matchAll(TWO_DIGIT_FDI_RE)) {
    if (match.index == null) continue;
    const absIndex = fragmentStart + match.index;
    if (isInsideRanges(absIndex, dateRanges)) continue;
    const code = match[1]!;
    if (!isValidFdi(code) || seen.has(code)) continue;
    seen.add(code);
    teeth.push(code);
  }

  return teeth;
}

function collectContextFragments(orderText: string): string[] {
  const fragments: string[] = [];

  for (const re of [SUPPORT_TEETH_CONTEXT_RE, TOOTH_WORD_CONTEXT_RE]) {
    re.lastIndex = 0;
    for (const match of orderText.matchAll(re)) {
      const captured = match[1]?.trim() ?? "";
      if (captured) fragments.push(captured);
    }
  }

  return fragments;
}

/** Извлекает номера зубов FDI из текста заказа (опора/лапки/зубы), без дат. */
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
    return merged;
  }

  return extractValidFdiFromFragment(text, { fullText: text, fragmentStart: 0 });
}

const TOOTH_BEARING_HINT_RE =
  /аппарат|коронк|мост|винир|накладк|культ|абатмент|имплант|сплинт|элайнер|капп|вкладк/i;

/** Подставляет teethFdi в hints, если ИИ/эвристика их не заполнили. */
export function enrichCompositionHintsWithTeethFdi(
  hints: CompositionHint[],
  orderText: string,
): CompositionHint[] {
  if (!orderText.trim() || hints.length === 0) return hints;

  const teeth = extractTeethFdiFromOrderText(orderText);
  if (teeth.length === 0) return hints;

  if (hints.length === 1) {
    const only = hints[0]!;
    if (only.teethFdi?.length) return hints;
    return [{ ...only, teethFdi: teeth }];
  }

  return hints.map((hint) => {
    if (hint.teethFdi?.length) return hint;
    if (!TOOTH_BEARING_HINT_RE.test(hint.nameHint)) return hint;
    return { ...hint, teethFdi: teeth };
  });
}
