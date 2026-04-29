export type PriceListGroupItem = {
  id: string;
  code: string;
  name: string;
  priceRub: number;
  leadWorkingDays: number | null;
  description?: string | null;
  sectionTitle?: string | null;
  subsectionTitle?: string | null;
};

export type PriceListSubsectionGroup = {
  subsectionKey: string;
  subsectionLabel: string;
  items: PriceListGroupItem[];
};

export type PriceListSectionGroup = {
  sectionKey: string;
  sectionLabel: string;
  subsections: PriceListSubsectionGroup[];
};

const NONE_SECTION = "__none__";
const DEFAULT_SUB = "__default__";

/** Порядок разделов и подразделов — как в отсортированном списке позиций (sortOrder). */
export function groupPriceListItems(
  items: PriceListGroupItem[],
): PriceListSectionGroup[] {
  const sectionOrder: string[] = [];
  const sectionMap = new Map<
    string,
    { subsectionOrder: string[]; subMap: Map<string, PriceListGroupItem[]> }
  >();

  for (const it of items) {
    const secRaw = it.sectionTitle?.trim() ?? "";
    const subRaw = it.subsectionTitle?.trim() ?? "";
    const secKey = secRaw ? secRaw : NONE_SECTION;
    if (!sectionMap.has(secKey)) {
      sectionOrder.push(secKey);
      sectionMap.set(secKey, { subsectionOrder: [], subMap: new Map() });
    }
    const block = sectionMap.get(secKey)!;
    const subKey = subRaw ? subRaw : DEFAULT_SUB;
    if (!block.subMap.has(subKey)) {
      block.subsectionOrder.push(subKey);
      block.subMap.set(subKey, []);
    }
    block.subMap.get(subKey)!.push(it);
  }

  return sectionOrder.map((secKey) => {
    const block = sectionMap.get(secKey)!;
    return {
      sectionKey: secKey,
      sectionLabel:
        secKey === NONE_SECTION ? "Без раздела" : secKey,
      subsections: block.subsectionOrder.map((subKey) => ({
        subsectionKey: subKey,
        subsectionLabel:
          subKey === DEFAULT_SUB ? "Позиции" : subKey,
        items: block.subMap.get(subKey)!,
      })),
    };
  });
}
