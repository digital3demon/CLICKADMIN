import "server-only";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { getActivePriceListId } from "@/lib/price-list-workspace";
import { resolvePriceOverrideMap } from "@/lib/price-overrides";
import {
  resolvePriceListItem,
  type PriceListItemRef,
} from "@/lib/order-import-export";
import { enrichCompositionHintsWithTeethFdi } from "@/lib/order-text-teeth-fdi";

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

/** Если scores близки — неоднозначно; при равной неясности берём более дешёвую позицию. */
const AMBIGUOUS_MATCH_SCORE_MARGIN = 25;

/** Слова, которые сами по себе не доказывают позицию в тексте заказа. */
const GENERIC_CATALOG_TOKENS = new Set([
  "аппарат",
  "коронка",
  "каппа",
  "сплинт",
  "модель",
  "ключ",
  "силиконовый",
  "печатной",
  "из",
  "для",
  "лечения",
  "на",
  "с",
  "и",
  "или",
  "прайс",
  "работа",
  "haas",
  "немедленная",
  "нагрузка",
  "разборная",
  "неразборная",
  "диагностическая",
  "сложный",
  "премиум",
  "сектора",
  "печатной",
  "модели",
]);

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

const TITAN_TOKEN_RE = new RegExp(`${WORD_LEFT}титан(?:овый|овая|овое)?${WORD_RIGHT}`, "iu");

function normalizeMaterialTokens(text: string): string {
  return text
    .replace(new RegExp(`${WORD_LEFT}титановый${WORD_RIGHT}`, "giu"), " титан ")
    .replace(new RegExp(`${WORD_LEFT}титановая${WORD_RIGHT}`, "giu"), " титан ")
    .replace(new RegExp(`${WORD_LEFT}титановое${WORD_RIGHT}`, "giu"), " титан ")
    .replace(/\s+/g, " ")
    .trim();
}

function materialVariantBoost(label: string, orderText: string): number {
  const text = normalizeMaterialTokens(orderText.toLowerCase());
  const hasTitanInText = TITAN_TOKEN_RE.test(text);
  const labelLower = label.toLowerCase();
  const hasTitanInLabel = TITAN_TOKEN_RE.test(labelLower);
  if (hasTitanInText && hasTitanInLabel) return 80;
  if (hasTitanInText && !hasTitanInLabel && /марко|росса|роса|haas/i.test(labelLower)) {
    return -60;
  }
  return 0;
}

function getDistinctiveCatalogTokens(name: string): string[] {
  return tokenizeForMatch(name).filter(
    (token) => token.length >= 3 && !GENERIC_CATALOG_TOKENS.has(token),
  );
}

/** «обрезка не заходя десну» при заказе каппы — не «индивидуализация десны» из прайса. */
export function isGumIndividualizationHallucination(
  hintName: string,
  orderText: string,
): boolean {
  if (!/индивидуализац/i.test(hintName) || !/десн/i.test(hintName)) return false;
  if (/индивидуализац/i.test(orderText)) return false;

  const hasKappaFamily = new RegExp(
    `${WORD_LEFT}(?:капп|капа|капу|элайнер|ретенц)${WORD_RIGHT}`,
    "iu",
  ).test(orderText);
  const hasTrimInstruction = /обрезк|не\s+заход(?:я|ить)|заканчивал(?:ась|ся)|на\s+зуб/iu.test(
    orderText,
  );
  return hasKappaFamily && hasTrimInstruction && /десн/i.test(orderText);
}

/** Есть ли в тексте заказа опора для hint (отсекает «храп» при заказе «марко роса»). */
export function hasOrderTextEvidenceForPriceHint(hintName: string, orderText: string): boolean {
  if (isGumIndividualizationHallucination(hintName, orderText)) return false;

  const text = normalizeMaterialTokens(stripNegatedPhrasesForMatching(orderText));
  if (!text.trim()) return true;

  const score = scorePriceItemMentionInOrderText(hintName, text);
  if (score <= 0) return false;

  const textTokens = tokenizeForMatch(normalizeMaterialTokens(text));
  const distinctiveStrong = getDistinctiveCatalogTokens(hintName).filter((token) => token.length >= 5);
  if (distinctiveStrong.length === 0) return true;

  const matchedStrong = distinctiveStrong.filter((token) =>
    textTokens.some((textToken) => tokenMatchStrength(token, textToken) > 0),
  );
  if (matchedStrong.length > 0) return true;

  const familyHead = tokenizeForMatch(hintName).find((token) =>
    ["модель", "сплинт", "коронка", "каппа", "аппарат", "немедленная", "нагрузка"].includes(token),
  );
  if (
    familyHead &&
    textTokens.some((textToken) => tokenMatchStrength(familyHead, textToken) > 0)
  ) {
    return !distinctiveStrong.some((token) => /храп/i.test(token));
  }

  return false;
}

export function filterCompositionHintsByOrderTextEvidence(
  hints: CompositionHint[],
  orderText: string,
): CompositionHint[] {
  const text = orderText.trim();
  if (!text) return hints;
  return hints.filter((hint) => hasOrderTextEvidenceForPriceHint(hint.nameHint, text));
}

/** Верхняя/верхнюю/на верхнюю челюсть — не часть названия прайса. */
const JAW_UPPER_MARKER = String.raw`(?:вч|(?:на\s+)?верх(?:нюю|няя|ней)(?:\s+челюсть)?|upper)`;
const JAW_LOWER_MARKER = String.raw`(?:нч|(?:на\s+)?ниж(?:нюю|няя|ней)(?:\s+челюсть)?|lower)`;

/** Челюсть в hint не часть названия прайса — убираем перед сопоставлением. */
const JAW_MARKER_RE = new RegExp(
  `${WORD_LEFT}(?:${JAW_UPPER_MARKER}|${JAW_LOWER_MARKER})${WORD_RIGHT}`,
  "giu",
);

/** «без ключа», «без силиконового ключа» — позиция не входит в состав. */
const ORDER_NEGATION_RE = new RegExp(
  `${WORD_LEFT}(?:без|не\\s+(?:нуж(?:ен|на|ны|но)|требу(?:ется|ются)|делать|изготавливать))\\s+([^\\n,.;()]{2,80})`,
  "giu",
);

export function extractNegatedOrderPhrases(orderText: string): string[] {
  const out: string[] = [];
  for (const match of orderText.matchAll(ORDER_NEGATION_RE)) {
    const phrase = match[1]?.trim().replace(/\s+/g, " ");
    if (phrase && phrase.length >= 2) out.push(phrase);
  }
  return out;
}

export function stripNegatedPhrasesForMatching(orderText: string): string {
  return orderText.replace(ORDER_NEGATION_RE, " ").replace(/\s+/g, " ").trim();
}

export function isPriceConceptNegatedInOrderText(concept: string, orderText: string): boolean {
  const negatedPhrases = extractNegatedOrderPhrases(orderText);
  if (negatedPhrases.length === 0) return false;

  const conceptTokens = tokenizeForMatch(concept);
  if (conceptTokens.length === 0) return false;

  for (const negated of negatedPhrases) {
    const negTokens = tokenizeForMatch(negated);
    if (negTokens.length === 0) continue;
    const negMatchesConcept = negTokens.every((negToken) =>
      conceptTokens.some((conceptToken) => tokensLooselyEqual(negToken, conceptToken)),
    );
    const conceptMatchesNeg = conceptTokens.some((conceptToken) =>
      negTokens.some((negToken) => tokensLooselyEqual(negToken, conceptToken)),
    );
    if (negMatchesConcept || conceptMatchesNeg) return true;
  }
  return false;
}

export function filterCompositionHintsByNegation(
  hints: CompositionHint[],
  orderText: string,
): CompositionHint[] {
  const text = orderText.trim();
  if (!text) return hints;
  return hints.filter((hint) => !isPriceConceptNegatedInOrderText(hint.nameHint, text));
}

export function filterResolvedLinesByNegation(
  lines: ResolvedCompositionLine[],
  orderText: string,
): ResolvedCompositionLine[] {
  const text = orderText.trim();
  if (!text) return lines;
  return lines.filter((line) => !isPriceConceptNegatedInOrderText(line.name, text));
}

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
  const itemTokens = tokenizeForMatch(normalizeMaterialTokens(itemName));
  if (itemTokens.length === 0) return 0;
  const textTokens = tokenizeForMatch(normalizeMaterialTokens(orderText));
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

  const matchText = stripNegatedPhrasesForMatching(text);
  const scored = priceListItemNames
    .map((name) => ({
      name,
      score: scorePriceItemMentionInOrderText(name, matchText || text),
    }))
    .filter(
      (row) =>
        row.score > 0 &&
        !isPriceConceptNegatedInOrderText(row.name, text) &&
        !isGumIndividualizationHallucination(row.name, text),
    )
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ru"));

  if (scored.length === 0) return [];
  const best = scored[0]!;
  const closeCandidates = scored.filter(
    (row) => best.score - row.score < AMBIGUOUS_MATCH_SCORE_MARGIN,
  );
  if (closeCandidates.length > 1) {
    const textHasMaterial = TITAN_TOKEN_RE.test(normalizeMaterialTokens(text.toLowerCase()));
    let chosenName = best.name;
    if (textHasMaterial) {
      const picked = pickBestSiblingVariant(
        closeCandidates.map((row) => ({ nameHint: row.name, unitPrice: 0 })),
        text,
      );
      chosenName = picked.nameHint ?? best.name;
    } else {
      chosenName = closeCandidates
        .slice()
        .sort(
          (a, b) =>
            tokenizeForMatch(a.name).length - tokenizeForMatch(b.name).length ||
            a.name.localeCompare(b.name, "ru"),
        )[0]!.name;
    }
    const jawQty = orderTextImpliesJawPairQuantity(text);
    return [{ nameHint: chosenName, quantity: jawQty ?? 1 }];
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

function findAmbiguousMatches(
  hint: string,
  items: CatalogItem[],
  orderText?: string,
): CatalogItem[] {
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
  if (substringMatches.length > 0) {
    const picked = pickBestCatalogMatch(hint, substringMatches, orderText);
    if (picked) return [picked];
    return substringMatches;
  }

  const tokenMatches = items.filter((it) => hintTokensMatchName(normalizedHint, it.name));
  if (tokenMatches.length === 0) return [];
  const picked = pickBestCatalogMatch(hint, tokenMatches, orderText);
  return picked ? [picked] : tokenMatches;
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

/** generic «Сплинт» vs specific «Сплинт сложный» — оставляем specific. */
export function isPriceNameStrictlyMoreSpecific(specific: string, generic: string): boolean {
  const specificTokens = tokenizeForMatch(specific);
  const genericTokens = tokenizeForMatch(generic);
  if (genericTokens.length === 0 || specificTokens.length <= genericTokens.length) {
    return false;
  }
  return genericTokens.every((genericToken) =>
    specificTokens.some((specificToken) => tokensLooselyEqual(genericToken, specificToken)),
  );
}

/** Варианты одной семьи прайса: «немедленная нагрузка …» vs «немедленная нагрузка …». */
export function areSiblingPriceNameVariants(a: string, b: string): boolean {
  if (isPriceNameStrictlyMoreSpecific(a, b) || isPriceNameStrictlyMoreSpecific(b, a)) {
    return false;
  }
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  const upperOnlyA =
    new RegExp(`${WORD_LEFT}${JAW_UPPER_MARKER}${WORD_RIGHT}`, "iu").test(lowerA) &&
    !new RegExp(`${WORD_LEFT}${JAW_LOWER_MARKER}${WORD_RIGHT}`, "iu").test(lowerA);
  const lowerOnlyA =
    new RegExp(`${WORD_LEFT}${JAW_LOWER_MARKER}${WORD_RIGHT}`, "iu").test(lowerA) &&
    !new RegExp(`${WORD_LEFT}${JAW_UPPER_MARKER}${WORD_RIGHT}`, "iu").test(lowerA);
  const upperOnlyB =
    new RegExp(`${WORD_LEFT}${JAW_UPPER_MARKER}${WORD_RIGHT}`, "iu").test(lowerB) &&
    !new RegExp(`${WORD_LEFT}${JAW_LOWER_MARKER}${WORD_RIGHT}`, "iu").test(lowerB);
  const lowerOnlyB =
    new RegExp(`${WORD_LEFT}${JAW_LOWER_MARKER}${WORD_RIGHT}`, "iu").test(lowerB) &&
    !new RegExp(`${WORD_LEFT}${JAW_UPPER_MARKER}${WORD_RIGHT}`, "iu").test(lowerB);
  if ((upperOnlyA && lowerOnlyB) || (lowerOnlyA && upperOnlyB)) {
    return false;
  }

  const left = tokenizeForMatch(a);
  const right = tokenizeForMatch(b);
  let shared = 0;
  for (const token of left) {
    if (right.some((other) => tokensLooselyEqual(token, other))) shared++;
  }
  if (shared >= 2) return true;
  const minLen = Math.min(left.length, right.length);
  return minLen > 0 && shared / minLen >= 0.5;
}

function pickCheapestCatalogItem(candidates: CatalogItem[]): CatalogItem {
  return [...candidates].sort(
    (a, b) =>
      (a.priceRub ?? 0) - (b.priceRub ?? 0) || a.name.localeCompare(b.name, "ru"),
  )[0]!;
}

function pickBestSiblingVariant<T extends { nameHint?: string; name?: string; unitPrice?: number }>(
  group: T[],
  orderText: string,
): T {
  if (group.length === 1) return group[0]!;
  const text = orderText.trim();

  if (text) {
    const scored = group.map((entry) => {
      const label = entry.nameHint ?? entry.name ?? "";
      let score = scorePriceItemMentionInOrderText(label, text);
      score += materialVariantBoost(label, text);
      return { entry, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]!;
    const second = scored[1];
    if (second && best.score - second.score >= AMBIGUOUS_MATCH_SCORE_MARGIN) {
      return best.entry;
    }
  }

  return group.reduce((best, cur) => {
    const bestPrice = best.unitPrice ?? Number.POSITIVE_INFINITY;
    const curPrice = cur.unitPrice ?? Number.POSITIVE_INFINITY;
    if (curPrice < bestPrice) return cur;
    if (curPrice > bestPrice) return best;
    const bestLabel = best.nameHint ?? best.name ?? "";
    const curLabel = cur.nameHint ?? cur.name ?? "";
    return tokenizeForMatch(curLabel).length > tokenizeForMatch(bestLabel).length ? cur : best;
  });
}

/** Оставляет одну позицию из группы «немедленная нагрузка …» / «немедленная нагрузка …». */
export function dedupeCompositionHintsBySiblingVariants(
  hints: CompositionHint[],
  orderText: string,
): CompositionHint[] {
  if (hints.length <= 1) return hints;
  const groups: CompositionHint[][] = [];

  for (const hint of hints) {
    const name = hint.nameHint.trim();
    if (!name) continue;
    let placed = false;
    for (const group of groups) {
      if (areSiblingPriceNameVariants(name, group[0]!.nameHint)) {
        group.push(hint);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([hint]);
  }

  return groups.map((group) => pickBestSiblingVariant(group, orderText));
}

function dedupeResolvedLinesBySiblingVariants(
  lines: ResolvedCompositionLine[],
  orderText: string,
): ResolvedCompositionLine[] {
  if (lines.length <= 1) return lines;
  const groups: ResolvedCompositionLine[][] = [];

  for (const line of lines) {
    let placed = false;
    for (const group of groups) {
      if (areSiblingPriceNameVariants(line.name, group[0]!.name)) {
        group.push(line);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([line]);
  }

  return groups.map((group) => pickBestSiblingVariant(group, orderText));
}

function scoreHintToCatalogItem(hint: string, item: CatalogItem): number {
  const normalizedHint = normalizeCompositionHintForMatch(hint);
  let score = 0;
  const nameLower = item.name.toLowerCase();
  const hintLower = normalizedHint.toLowerCase();
  if (nameLower === hintLower) score += 1000;
  if (hintTokensMatchName(normalizedHint, item.name)) score += 500;
  score += tokenizeForMatch(item.name).length * 3;
  if (nameLower.includes(hintLower)) score += 120;
  if (hintLower.includes(nameLower)) score += 80;
  return score;
}

function catalogItemSiblingPick(candidates: CatalogItem[], orderText: string): CatalogItem {
  if (candidates.length === 1) return candidates[0]!;
  const picked = pickBestSiblingVariant(
    candidates.map((item) => ({ name: item.name, unitPrice: item.priceRub })),
    orderText,
  );
  const pickedName = picked.name ?? candidates[0]!.name;
  return candidates.find((item) => item.name === pickedName) ?? pickCheapestCatalogItem(candidates);
}

function pickBestCatalogMatch(
  hint: string,
  candidates: CatalogItem[],
  orderText?: string,
): CatalogItem | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;
  const scored = candidates
    .map((item) => {
      let score = scoreHintToCatalogItem(hint, item);
      if (orderText?.trim()) {
        score += scorePriceItemMentionInOrderText(item.name, orderText) * 0.4;
        score += materialVariantBoost(item.name, orderText);
      }
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0]!;
  const second = scored[1];
  if (!second || best.score - second.score >= AMBIGUOUS_MATCH_SCORE_MARGIN) {
    const top = scored.filter((row) => row.score === best.score).map((row) => row.item);
    return orderText?.trim()
      ? catalogItemSiblingPick(top, orderText)
      : pickCheapestCatalogItem(top);
  }
  return orderText?.trim()
    ? catalogItemSiblingPick(candidates, orderText)
    : pickCheapestCatalogItem(candidates);
}

function upgradeCatalogItemForOrderMaterial(
  item: CatalogItem,
  catalog: CatalogItem[],
  orderText: string,
): CatalogItem {
  const text = orderText.trim();
  if (!text) return item;

  const textHasTitan = TITAN_TOKEN_RE.test(normalizeMaterialTokens(text.toLowerCase()));
  const itemHasTitan = TITAN_TOKEN_RE.test(item.name.toLowerCase());
  if (!textHasTitan) return item;
  if (itemHasTitan) return item;

  const upgrades = catalog.filter(
    (candidate) =>
      candidate.id !== item.id &&
      isPriceNameStrictlyMoreSpecific(candidate.name, item.name) &&
      TITAN_TOKEN_RE.test(candidate.name.toLowerCase()),
  );
  if (upgrades.length === 0) return item;
  if (upgrades.length === 1) return upgrades[0]!;
  return pickBestCatalogMatch(item.name, upgrades, orderText) ?? upgrades[0]!;
}

/** Убирает пары вроде «сплинт» + «сплинт сложный» из hints ИИ и эвристик. */
export function dedupeCompositionHintsBySpecificity(hints: CompositionHint[]): CompositionHint[] {
  if (hints.length <= 1) return hints;
  const sorted = [...hints].sort(
    (a, b) => tokenizeForMatch(b.nameHint).length - tokenizeForMatch(a.nameHint).length,
  );
  const kept: CompositionHint[] = [];
  for (const hint of sorted) {
    const name = hint.nameHint.trim();
    if (!name) continue;
    const dominated = kept.some((other) =>
      isPriceNameStrictlyMoreSpecific(other.nameHint, name),
    );
    if (!dominated) kept.push(hint);
  }
  return kept;
}

function dedupeResolvedLinesByNameSpecificity(
  lines: ResolvedCompositionLine[],
): ResolvedCompositionLine[] {
  return lines.filter(
    (line) =>
      !lines.some(
        (other) =>
          other.priceListItemId !== line.priceListItemId &&
          isPriceNameStrictlyMoreSpecific(other.name, line.name),
      ),
  );
}

export async function resolveAiCompositionLines(
  hints: CompositionHint[] | null | undefined,
  opts: {
    clinicId: string | null;
    doctorId: string | null;
    negationOrderText?: string | null;
  },
): Promise<ResolveCompositionResult> {
  const warnings: string[] = [];
  const lines: ResolvedCompositionLine[] = [];
  if (!hints?.length) {
    return { lines, warnings, maxLeadWorkingDays: 0 };
  }

  const negationText = opts.negationOrderText?.trim() ?? "";
  let workingHints = dedupeCompositionHintsBySpecificity(hints);
  if (negationText) {
    workingHints = filterCompositionHintsByNegation(workingHints, negationText);
    workingHints = filterCompositionHintsByOrderTextEvidence(workingHints, negationText);
    workingHints = enrichCompositionHintsWithTeethFdi(workingHints, negationText);
  }

  const catalog = await loadPriceListItemsForClient(opts.clinicId, opts.doctorId);
  const catalogRefs: PriceListItemRef[] = catalog.map(({ id, code, name }) => ({
    id,
    code,
    name,
  }));

  for (const hint of workingHints) {
    const nameHint = hint.nameHint?.trim();
    if (!nameHint) continue;

    let item = resolvePriceListItem(normalizeCompositionHintForMatch(nameHint), catalogRefs);
    if (!item) {
      item = resolvePriceListItem(nameHint, catalogRefs);
    }
    if (!item) {
      const candidates = findAmbiguousMatches(nameHint, catalog, negationText);
      if (candidates.length === 1) {
        item = candidates[0];
      } else if (candidates.length > 1) {
        item =
          pickBestCatalogMatch(nameHint, candidates, negationText) ??
          pickCheapestCatalogItem(candidates);
      } else {
        warnings.push(`Не найдено в прайсе: «${nameHint}»`);
        continue;
      }
    }

    let full = catalog.find((c) => c.id === item!.id);
    if (full && negationText) {
      full = upgradeCatalogItemForOrderMaterial(full, catalog, negationText);
      item = full;
    }
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

  let mergedLines = dedupeResolvedLinesByNameSpecificity(
    mergeResolvedLinesByPriceItem(lines),
  );
  mergedLines = dedupeResolvedLinesBySiblingVariants(mergedLines, negationText);
  if (negationText) {
    mergedLines = filterResolvedLinesByNegation(mergedLines, negationText);
  }
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
