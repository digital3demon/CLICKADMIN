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

const FUZZY_HINT_MIN_LEN = 4;

function findAmbiguousMatches(hint: string, items: CatalogItem[]): CatalogItem[] {
  const q = hint.trim().toLowerCase();
  if (q.length < FUZZY_HINT_MIN_LEN) return [];
  return items.filter((it) => {
    const name = it.name.toLowerCase();
    const both = `${it.code} ${it.name}`.toLowerCase();
    if (name === q || both === q) return true;
    if (name.includes(q) || q.includes(name)) return true;
    if (both.includes(q)) return true;
    return false;
  });
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

    let item = resolvePriceListItem(nameHint, catalogRefs);
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

  const maxLeadWorkingDays = lines.reduce(
    (max, l) => Math.max(max, l.leadWorkingDays ?? 0),
    0,
  );

  return { lines, warnings, maxLeadWorkingDays };
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
