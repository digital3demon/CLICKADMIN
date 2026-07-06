import "server-only";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { getActivePriceListId } from "@/lib/price-list-workspace";
import { resolvePriceOverrideMap } from "@/lib/price-overrides";
import {
  resolvePriceListItem,
  type PriceListItemRef,
} from "@/lib/order-import-export";

export type CompositionHint = {
  nameHint: string;
  quantity?: number | null;
  teethFdi?: string[] | null;
};

export type ResolvedCompositionLine = {
  priceListItemId: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  leadWorkingDays: number | null;
  teethFdi: string[];
};

export type ResolveCompositionResult = {
  lines: ResolvedCompositionLine[];
  warnings: string[];
  maxLeadWorkingDays: number;
};

type CatalogItem = PriceListItemRef & {
  priceRub: number;
  leadWorkingDays: number | null;
};

async function loadPriceListItemsForClient(
  clinicId: string | null,
  doctorId: string | null,
): Promise<CatalogItem[]> {
  const prisma = getPricingPrismaClient();
  const priceListId = await getActivePriceListId(prisma);
  const items = await prisma.priceListItem.findMany({
    where: { isActive: true, priceListId },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, priceRub: true, leadWorkingDays: true },
  });

  const overrideByItemId = await resolvePriceOverrideMap(prisma, {
    priceListItemIds: items.map((it) => it.id),
    clinicId: clinicId?.trim() || null,
    doctorId: doctorId?.trim() || null,
  });

  return items.map((it) => ({
    id: it.id,
    code: it.code,
    name: it.name,
    priceRub: overrideByItemId.get(it.id) ?? it.priceRub,
    leadWorkingDays: it.leadWorkingDays,
  }));
}

export async function loadActivePriceListItemNames(): Promise<string[]> {
  const prisma = getPricingPrismaClient();
  const priceListId = await getActivePriceListId(prisma);
  const items = await prisma.priceListItem.findMany({
    where: { isActive: true, priceListId },
    select: { name: true },
  });
  return items.map((it) => it.name);
}

const FUZZY_HINT_MIN_LEN = 4;

/** Латиница в прайсе vs кириллица в письме (Marco Rosa, Emax) — визуально похожие буквы. */
const LATIN_TO_CYRILLIC_FOLD: Record<string, string> = {
  a: "а",
  c: "с",
  e: "е",
  h: "н",
  k: "к",
  m: "м",
  n: "н",
  o: "о",
  p: "р",
  r: "р",
  s: "с",
  t: "т",
  x: "х",
  y: "у",
};

function foldScriptLookalikes(token: string): string {
  return token
    .toLowerCase()
    .split("")
    .map((ch) => LATIN_TO_CYRILLIC_FOLD[ch] ?? ch)
    .join("");
}

/** JS `\b` не считает кириллицу «словом» — явные границы букв/цифр. */
const WORD_LEFT = String.raw`(?<![\p{L}\p{N}])`;
const WORD_RIGHT = String.raw`(?![\p{L}\p{N}])`;

/** Верхняя/верхнюю/на верхнюю челюсть — не часть названия прайса. */
const JAW_UPPER_MARKER = String.raw`(?:вч|(?:на\s+)?верх(?:нюю|няя|ней)(?:\s+челюсть)?|upper)`;
const JAW_LOWER_MARKER = String.raw`(?:нч|(?:на\s+)?ниж(?:нюю|няя|ней)(?:\s+челюсть)?|lower)`;

/** Челюсть в hint не часть названия прайса — убираем перед сопоставлением. */
const JAW_MARKER_RE = new RegExp(
  `${WORD_LEFT}(?:${JAW_UPPER_MARKER}|${JAW_LOWER_MARKER})${WORD_RIGHT}`,
  "giu",
);

/** Частые орфографические варианты (не привязка к одной позиции прайса). */
export function normalizeCompositionHintForMatch(hint: string): string {
  return hint
    .toLowerCase()
    .replace(/\\/g, " ")
    .replace(JAW_MARKER_RE, " ")
    .replace(new RegExp(`${WORD_LEFT}капы${WORD_RIGHT}`, "gu"), "каппа")
    .replace(new RegExp(`${WORD_LEFT}капу${WORD_RIGHT}`, "gu"), "каппа")
    .replace(new RegExp(`${WORD_LEFT}капа${WORD_RIGHT}`, "gu"), "каппа")
    .replace(new RegExp(`${WORD_LEFT}кап${WORD_RIGHT}`, "gu"), "каппа")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensLooselyEqual(a: string, b: string): boolean {
  if (a === b) return true;
  const foldedA = foldScriptLookalikes(a);
  const foldedB = foldScriptLookalikes(b);
  if (foldedA === foldedB) return true;
  if (levenshteinDistanceAtMostOne(foldedA, foldedB)) return true;
  const minLen = Math.min(a.length, b.length);
  if (minLen < 4) return false;
  const stemLen = Math.min(minLen, 5);
  if (a.slice(0, stemLen) === b.slice(0, stemLen)) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (Math.abs(a.length - b.length) <= 1 && longer.startsWith(shorter)) return true;
  return levenshteinDistanceAtMostOne(a, b);
}

function levenshteinDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i] && ++diff > 1) return false;
    }
    return true;
  }
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
      continue;
    }
    if (skipped) return false;
    skipped = true;
    j++;
  }
  return true;
}

function tokenizeForMatch(text: string): string[] {
  const normalized = normalizeCompositionHintForMatch(text);
  return normalized
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

/** Все значимые слова hint есть в названии прайса (порядок и окончания не важны). */
function hintTokensMatchName(hint: string, itemName: string): boolean {
  const hintTokens = tokenizeForMatch(hint);
  if (hintTokens.length === 0) return false;
  const nameTokens = tokenizeForMatch(itemName);
  return hintTokens.every((token) =>
    nameTokens.some((nameToken) => tokensLooselyEqual(token, nameToken)),
  );
}

function tokenMatchStrength(itemToken: string, textToken: string): number {
  if (itemToken === textToken) return 3;
  if (levenshteinDistanceAtMostOne(itemToken, textToken)) return 2;
  const foldedItem = foldScriptLookalikes(itemToken);
  const foldedText = foldScriptLookalikes(textToken);
  if (foldedItem === foldedText) return 1;
  if (levenshteinDistanceAtMostOne(foldedItem, foldedText)) return 1;
  return 0;
}

function scorePriceItemMentionInOrderText(itemName: string, orderText: string): number {
  const itemTokens = tokenizeForMatch(itemName);
  if (itemTokens.length === 0) return 0;
  const textTokens = tokenizeForMatch(orderText);
  if (textTokens.length === 0) return 0;

  let matched = 0;
  let matchStrength = 0;
  for (const itemToken of itemTokens) {
    let bestStrength = 0;
    for (const textToken of textTokens) {
      bestStrength = Math.max(bestStrength, tokenMatchStrength(itemToken, textToken));
    }
    if (bestStrength > 0) {
      matched++;
      matchStrength += bestStrength;
    }
  }
  if (matched === 0) return 0;

  const textCoverage = matched / textTokens.length;
  const itemCoverage = matched / itemTokens.length;
  const unmatchedLong = itemTokens.filter(
    (itemToken) =>
      itemToken.length >= 4 &&
      !textTokens.some((textToken) => tokenMatchStrength(itemToken, textToken) > 0),
  ).length;

  let score = matched * 100 + textCoverage * 20 + itemCoverage * 10 + matchStrength * 5;
  score -= unmatchedLong * 8;
  return score;
}

function orderTextImpliesJawPairQuantity(orderText: string): number | null {
  const lower = orderText.toLowerCase();
  const hasUpper = new RegExp(`${WORD_LEFT}${JAW_UPPER_MARKER}${WORD_RIGHT}`, "iu").test(
    lower,
  );
  const hasLower = new RegExp(`${WORD_LEFT}${JAW_LOWER_MARKER}${WORD_RIGHT}`, "iu").test(
    lower,
  );
  if (hasUpper && hasLower) return 2;
  return null;
}

/** Если ИИ не дал hints — ищем упоминания позиций прайса в тексте заказа. */
export function inferCompositionHintsFromOrderText(
  orderText: string,
  priceListItemNames: string[],
): CompositionHint[] {
  const text = orderText.trim();
  if (!text) return [];

  const scored = priceListItemNames
    .map((name) => ({ name, score: scorePriceItemMentionInOrderText(name, text) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ru"));

  if (scored.length === 0) return [];
  const best = scored[0]!;
  if (scored.length > 1 && scored[1]!.score === best.score) {
    return [];
  }

  const jawQty = orderTextImpliesJawPairQuantity(text);
  return [{ nameHint: best.name, quantity: jawQty ?? 1 }];
}

/** Ищет позицию прайса в теме письма, тексте заказа и PDF — по фрагментам и целиком. */
export function inferCompositionHintsFromEmailContext(
  parts: {
    clientOrderText?: string | null;
    emailSubject?: string | null;
    pdfOrderText?: string | null;
  },
  priceListItemNames: string[],
): CompositionHint[] {
  const segments = new Set<string>();
  const addSegments = (text: string | null | undefined) => {
    const trimmed = text?.trim() ?? "";
    if (!trimmed) return;
    segments.add(trimmed);
    for (const piece of trimmed.split(/[,;]/)) {
      const seg = piece.trim();
      if (seg.length >= 4) segments.add(seg);
    }
  };

  addSegments(parts.clientOrderText);
  addSegments(parts.emailSubject);
  addSegments(parts.pdfOrderText);

  const mergedHints: CompositionHint[] = [];
  const seenNames = new Set<string>();

  for (const segment of segments) {
    for (const hint of inferCompositionHintsFromOrderText(segment, priceListItemNames)) {
      const key = hint.nameHint.trim().toLowerCase();
      if (!key || seenNames.has(key)) continue;
      seenNames.add(key);
      mergedHints.push(hint);
    }
  }

  if (mergedHints.length > 0) return mergedHints;

  const combined = [parts.clientOrderText, parts.emailSubject, parts.pdfOrderText]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
  return inferCompositionHintsFromOrderText(combined, priceListItemNames);
}

function findAmbiguousMatches(hint: string, items: CatalogItem[]): CatalogItem[] {
  const normalizedHint = normalizeCompositionHintForMatch(hint);
  const q = normalizedHint.trim().toLowerCase();
  if (q.length < FUZZY_HINT_MIN_LEN) return [];
  const substringMatches = items.filter((it) => {
    const name = it.name.toLowerCase();
    const both = `${it.code} ${it.name}`.toLowerCase();
    if (name === q || both === q) return true;
    if (name.includes(q) || q.includes(name)) return true;
    if (both.includes(q)) return true;
    return false;
  });
  if (substringMatches.length > 0) return substringMatches;

  return items.filter((it) => hintTokensMatchName(normalizedHint, it.name));
}

function mergeResolvedLinesByPriceItem(lines: ResolvedCompositionLine[]): ResolvedCompositionLine[] {
  const merged = new Map<string, ResolvedCompositionLine>();
  for (const line of lines) {
    const existing = merged.get(line.priceListItemId);
    if (!existing) {
      merged.set(line.priceListItemId, { ...line, teethFdi: [...line.teethFdi] });
      continue;
    }
    existing.quantity += line.quantity;
    existing.teethFdi.push(...line.teethFdi);
  }
  return [...merged.values()];
}

export async function resolveAiCompositionLines(
  hints: CompositionHint[] | null | undefined,
  opts: { clinicId: string | null; doctorId: string | null },
): Promise<ResolveCompositionResult> {
  const warnings: string[] = [];
  const lines: ResolvedCompositionLine[] = [];
  if (!hints?.length) {
    return { lines, warnings, maxLeadWorkingDays: 0 };
  }

  const catalog = await loadPriceListItemsForClient(opts.clinicId, opts.doctorId);
  const catalogRefs: PriceListItemRef[] = catalog.map(({ id, code, name }) => ({
    id,
    code,
    name,
  }));

  for (const hint of hints) {
    const nameHint = hint.nameHint?.trim();
    if (!nameHint) continue;

    let item = resolvePriceListItem(normalizeCompositionHintForMatch(nameHint), catalogRefs);
    if (!item) {
      item = resolvePriceListItem(nameHint, catalogRefs);
    }
    if (!item) {
      const candidates = findAmbiguousMatches(nameHint, catalog);
      if (candidates.length === 1) {
        item = candidates[0];
      } else if (candidates.length > 1) {
        const samePrice = new Set(candidates.map((c) => c.priceRub ?? 0));
        if (samePrice.size === 1) {
          item = candidates[0];
        } else {
          warnings.push(
            `Неоднозначная позиция прайса: «${nameHint}» (${candidates.length} вариантов)`,
          );
          continue;
        }
      } else {
        warnings.push(`Не найдено в прайсе: «${nameHint}»`);
        continue;
      }
    }

    const full = catalog.find((c) => c.id === item!.id);
    const qty =
      hint.quantity != null && Number.isFinite(hint.quantity) && hint.quantity >= 1
        ? Math.floor(hint.quantity)
        : 1;
    const teeth =
      Array.isArray(hint.teethFdi) && hint.teethFdi.length > 0
        ? hint.teethFdi.map(String)
        : [];

    lines.push({
      priceListItemId: item.id,
      code: item.code,
      name: item.name,
      quantity: qty,
      unitPrice: full?.priceRub ?? 0,
      leadWorkingDays: full?.leadWorkingDays ?? null,
      teethFdi: teeth,
    });
  }

  const mergedLines = mergeResolvedLinesByPriceItem(lines);
  const maxLeadWorkingDays = mergedLines.reduce(
    (max, l) => Math.max(max, l.leadWorkingDays ?? 0),
    0,
  );

  return { lines: mergedLines, warnings, maxLeadWorkingDays };
}

export function compositionLinesToOrderConstructions(
  lines: ResolvedCompositionLine[],
): Array<{
  category: string;
  constructionTypeId: string | null;
  priceListItemId: string;
  priceListItem: {
    id: string;
    code: string;
    name: string;
    priceRub: number;
    leadWorkingDays?: number | null;
    variablePrice?: boolean;
  } | null;
  materialId: string | null;
  shade: string | null;
  quantity: number;
  unitPrice: number | null;
  lineDiscountPercent: number | null;
  teethFdi: unknown;
  bridgeFromFdi: string | null;
  bridgeToFdi: string | null;
  arch: string | null;
}> {
  return lines.map((l) => ({
    category: "PRICE_LIST",
    constructionTypeId: null,
    priceListItemId: l.priceListItemId,
    priceListItem: {
      id: l.priceListItemId,
      code: l.code,
      name: l.name,
      priceRub: l.unitPrice,
      leadWorkingDays: l.leadWorkingDays,
      variablePrice: false,
    },
    materialId: null,
    shade: null,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineDiscountPercent: 0,
    teethFdi: l.teethFdi.length > 0 ? l.teethFdi : null,
    bridgeFromFdi: null,
    bridgeToFdi: null,
    arch: null,
  }));
}
