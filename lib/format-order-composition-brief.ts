import type { ConstructionCategory } from "@prisma/client";

type BriefLine = {
  quantity: number;
  category: ConstructionCategory;
  constructionType: { name: string } | null;
  priceListItem: { code: string; name: string } | null;
};

/** Краткая строка состава наряда для списков и печати. */
export function formatOrderCompositionBrief(lines: BriefLine[]): string {
  if (!lines.length) return "—";
  const parts = lines.map((line) => {
    let label: string;
    if (line.category === "PRICE_LIST") {
      const pl = line.priceListItem;
      if (pl) {
        const code = pl.code?.trim();
        const name = pl.name?.trim() || "Позиция прайса";
        label = code ? `${code} · ${name}` : name;
      } else {
        label = "Позиция прайса";
      }
    } else {
      label = line.constructionType?.name?.trim() || "Работа";
    }
    const q = line.quantity > 1 ? ` ×${line.quantity}` : "";
    return `${label}${q}`;
  });
  return parts.join("; ");
}
