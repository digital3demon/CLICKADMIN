import "server-only";

import type { PrismaClient } from "@prisma/client";
import {
  parseWorkExampleShowcaseBrand,
  resolveWorkExampleShowcaseName,
  WORK_EXAMPLE_SHOWCASE_STATE_KEY,
  type WorkExampleShowcaseBrand,
} from "@/lib/work-examples/constants";

export async function loadWorkExampleShowcaseBrand(
  db: PrismaClient,
  tenantId: string,
  tenantName: string | null | undefined,
): Promise<WorkExampleShowcaseBrand & { labName: string }> {
  const row = await db.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: WORK_EXAMPLE_SHOWCASE_STATE_KEY } },
    select: { value: true },
  });
  const brand = parseWorkExampleShowcaseBrand(row?.value ?? null);
  return {
    ...brand,
    labName: resolveWorkExampleShowcaseName(brand.displayName, tenantName),
  };
}

export async function saveWorkExampleShowcaseBrand(
  db: PrismaClient,
  tenantId: string,
  brand: WorkExampleShowcaseBrand,
): Promise<void> {
  await db.tenantClientState.upsert({
    where: { tenantId_key: { tenantId, key: WORK_EXAMPLE_SHOWCASE_STATE_KEY } },
    create: {
      tenantId,
      key: WORK_EXAMPLE_SHOWCASE_STATE_KEY,
      value: brand as never,
    },
    update: { value: brand as never },
  });
}
