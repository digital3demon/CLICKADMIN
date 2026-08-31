import type { PrismaClient } from "@prisma/client";

type OverrideRow = { priceListItemId: string; priceRub: number };

/**
 * Приоритет: doctor+clinic > doctor > clinic.
 * Только позиции из `ids` (оверрайды другой клиники/списка отбрасываем).
 */
export function mergePriceOverrideRows(
  ids: readonly string[],
  clinicRows: readonly OverrideRow[],
  doctorRows: readonly OverrideRow[],
  pairRows: readonly OverrideRow[],
): Map<string, number> {
  const idSet = new Set(ids);
  const out = new Map<string, number>();
  for (const row of clinicRows) {
    if (idSet.has(row.priceListItemId)) out.set(row.priceListItemId, row.priceRub);
  }
  for (const row of doctorRows) {
    if (idSet.has(row.priceListItemId)) out.set(row.priceListItemId, row.priceRub);
  }
  for (const row of pairRows) {
    if (idSet.has(row.priceListItemId)) out.set(row.priceListItemId, row.priceRub);
  }
  return out;
}

export async function resolvePriceOverrideMap(
  prisma: PrismaClient,
  input: {
    priceListItemIds: string[];
    clinicId?: string | null;
    doctorId?: string | null;
  },
): Promise<Map<string, number>> {
  const ids = [...new Set(input.priceListItemIds.map((x) => String(x).trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const clinicId = input.clinicId?.trim() || null;
  const doctorId = input.doctorId?.trim() || null;

  /**
   * Без `priceListItemId IN (весь каталог)` — SQLite/Postgres иначе сканируют тысячи id.
   * Оверрайдов у клиники обычно мало; фильтр по ids — в памяти.
   */
  const [clinicRows, doctorRows, pairRows] = await Promise.all([
    clinicId
      ? prisma.clinicPriceOverride.findMany({
          where: { clinicId },
          select: { priceListItemId: true, priceRub: true },
        })
      : Promise.resolve([]),
    doctorId
      ? prisma.doctorPriceOverride.findMany({
          where: { doctorId },
          select: { priceListItemId: true, priceRub: true },
        })
      : Promise.resolve([]),
    clinicId && doctorId
      ? prisma.doctorClinicPriceOverride.findMany({
          where: { clinicId, doctorId },
          select: { priceListItemId: true, priceRub: true },
        })
      : Promise.resolve([]),
  ]);

  return mergePriceOverrideRows(ids, clinicRows, doctorRows, pairRows);
}
