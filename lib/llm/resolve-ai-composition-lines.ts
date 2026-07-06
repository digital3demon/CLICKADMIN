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

/** JS `\b` не считает кириллицу «словом» — явные границы букв/цифр. */
const WORD_LEFT = String.raw`(?<![\p{L}\p{N}])`;
const WORD_RIGHT = String.raw`(?![\p{L}\p{N}])`;

/** Челюсть в hint не часть названия прайса — убираем перед сопоставлением. */
const JAW_MARKER_RE = new RegExp(
  `${WORD_LEFT}(?:вч|нч|верх(?:няя)?(?:\\s+челюсть)?|ниж(?:няя)?(?:\\s+челюсть)?|upper|lower)${WORD_RIGHT}`,
  "giu",
);

/** Капа/капы/кап → канон «каппа» для сопоставления с прайсом. */
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

function tokenizeForMatch(text: string): string[] {
  const normalized = normalizeCompositionHintForMatch(text);
  return normalized
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

/** Все значимые слова hint есть в названии прайса (порядок не важен). */
function hintTokensMatchName(hint: string, itemName: string): boolean {
  const hintTokens = tokenizeForMatch(hint);
  if (hintTokens.length === 0) return false;
  const nameTokens = new Set(tokenizeForMatch(itemName));
  return hintTokens.every((token) => nameTokens.has(token));
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
