/**
 * Параметры GET /api/price-list-items.
 * slim — без description (модалка наряда).
 * code — одна позиция (например КП), не весь каталог.
 */
export function parsePriceListItemsQuery(url: URL): {
  listId: string;
  clinicId: string;
  doctorId: string;
  slim: boolean;
  code: string;
} {
  return {
    listId: url.searchParams.get("listId")?.trim() ?? "",
    clinicId: url.searchParams.get("clinicId")?.trim() ?? "",
    doctorId: url.searchParams.get("doctorId")?.trim() ?? "",
    slim: url.searchParams.get("slim") === "1",
    code: url.searchParams.get("code")?.trim() ?? "",
  };
}

export function priceListItemSelect(slim: boolean) {
  return {
    id: true,
    code: true,
    name: true,
    sectionTitle: true,
    subsectionTitle: true,
    priceRub: true,
    leadWorkingDays: true,
    variablePrice: true,
    ...(slim ? {} : { description: true }),
  } as const;
}

export function priceListItemWhere(input: {
  priceListId: string;
  code?: string;
}): { isActive: true; priceListId: string; code?: string } {
  const code = (input.code || "").trim();
  return {
    isActive: true,
    priceListId: input.priceListId,
    ...(code ? { code } : {}),
  };
}
