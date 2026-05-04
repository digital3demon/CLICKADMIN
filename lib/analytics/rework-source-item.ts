import type { ConstructionCategory } from "@prisma/client";
import { CORRECTION_PRICE_ITEM_CODE } from "@/lib/pricing/correction-price-item";

const PRICE_LIST = "PRICE_LIST" satisfies ConstructionCategory;

export type ReworkSourceLine = {
  id: string;
  category: ConstructionCategory;
  quantity: number;
  priceListItem: { id: string; code: string; name: string } | null;
  constructionType: { id: string; code: string | null; name: string } | null;
};

export function reworkSourceItem(line: ReworkSourceLine) {
  if (line.category === PRICE_LIST) {
    const item = line.priceListItem;
    if (!item || item.code === CORRECTION_PRICE_ITEM_CODE) return null;
    return {
      id: `price:${item.id}`,
      code: item.code || "—",
      name: item.name || "Позиция прайса",
    };
  }

  const type = line.constructionType;
  if (!type) {
    return {
      id: `line:${line.id}`,
      code: "—",
      name: "Работа без типа",
    };
  }

  return {
    id: `type:${type.id}`,
    code: type.code || "—",
    name: type.name || "Работа",
  };
}
