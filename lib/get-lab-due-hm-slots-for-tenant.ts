import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import {
  DEFAULT_LAB_DUE_HM_SLOTS,
  normalizeLabDueHmSlots,
} from "@/lib/lab-due-hm-slots";
import {
  DEFAULT_PRODUCTION_CALENDAR_COUNTRY,
  normalizeProductionCalendarCountry,
  type ProductionCalendarCountry,
} from "@/lib/production-calendar";

export async function getLabDueHmSlotsForTenant(
  tenantId: string | null,
): Promise<string[]> {
  if (!tenantId) return [...DEFAULT_LAB_DUE_HM_SLOTS];
  const prisma = await getPrisma();
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { labDueHmSlots: true },
  });
  return normalizeLabDueHmSlots(row?.labDueHmSlots ?? null);
}

export async function getLabDueSettingsForTenant(
  tenantId: string | null,
): Promise<{ slots: string[]; country: ProductionCalendarCountry }> {
  if (!tenantId) {
    return {
      slots: [...DEFAULT_LAB_DUE_HM_SLOTS],
      country: DEFAULT_PRODUCTION_CALENDAR_COUNTRY,
    };
  }
  const prisma = await getPrisma();
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      labDueHmSlots: true,
      productionCalendarCountry: true,
    },
  });
  return {
    slots: normalizeLabDueHmSlots(row?.labDueHmSlots ?? null),
    country: normalizeProductionCalendarCountry(row?.productionCalendarCountry),
  };
}
