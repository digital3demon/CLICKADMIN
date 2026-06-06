import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_PAYROLL_KIND_TRACK_MAP,
  PAYROLL_KIND_TRACK_MAP_KEY,
  normalizePayrollKindTrackMap,
  type PayrollKindTrackMap,
} from "@/lib/payroll-tracks";

export async function getPayrollKindTrackMap(
  prisma: PrismaClient,
  tenantId: string,
): Promise<PayrollKindTrackMap> {
  const row = await prisma.tenantClientState.findUnique({
    where: {
      tenantId_key: { tenantId, key: PAYROLL_KIND_TRACK_MAP_KEY },
    },
    select: { value: true },
  });
  if (!row?.value) return { ...DEFAULT_PAYROLL_KIND_TRACK_MAP };
  return normalizePayrollKindTrackMap(row.value);
}

export async function setPayrollKindTrackMap(
  prisma: PrismaClient,
  tenantId: string,
  map: PayrollKindTrackMap,
): Promise<PayrollKindTrackMap> {
  const normalized = normalizePayrollKindTrackMap(map);
  await prisma.tenantClientState.upsert({
    where: {
      tenantId_key: { tenantId, key: PAYROLL_KIND_TRACK_MAP_KEY },
    },
    create: {
      tenantId,
      key: PAYROLL_KIND_TRACK_MAP_KEY,
      value: normalized as never,
    },
    update: {
      value: normalized as never,
    },
  });
  return normalized;
}
