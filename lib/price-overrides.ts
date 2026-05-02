import type { PrismaClient } from "@prisma/client";

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

  const [clinicRows, doctorRows, pairRows] = await Promise.all([
    clinicId
      ? prisma.clinicPriceOverride.findMany({
          where: { clinicId, priceListItemId: { in: ids } },
          select: { priceListItemId: true, priceRub: true },
        })
      : Promise.resolve([]),
    doctorId
      ? prisma.doctorPriceOverride.findMany({
          where: { doctorId, priceListItemId: { in: ids } },
          select: { priceListItemId: true, priceRub: true },
        })
      : Promise.resolve([]),
    clinicId && doctorId
      ? prisma.doctorClinicPriceOverride.findMany({
          where: { clinicId, doctorId, priceListItemId: { in: ids } },
          select: { priceListItemId: true, priceRub: true },
        })
      : Promise.resolve([]),
  ]);

  // Приоритет: doctor+clinic > doctor > clinic.
  const out = new Map<string, number>();
  for (const row of clinicRows) out.set(row.priceListItemId, row.priceRub);
  for (const row of doctorRows) out.set(row.priceListItemId, row.priceRub);
  for (const row of pairRows) out.set(row.priceListItemId, row.priceRub);
  return out;
}
