import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import {
  DEFAULT_LAB_DUE_HM_SLOTS,
  normalizeLabDueHmSlots,
} from "@/lib/lab-due-hm-slots";

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
