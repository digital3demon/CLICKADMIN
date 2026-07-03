/**
 * Entrypoints sync: проверка tenant-флага перед outbound/inbound Kaiten.
 */
import type { PrismaClient } from "@prisma/client";
import { gateKaitenIntegration } from "@/lib/kaiten-integration/guard";

export type KaitenSyncSkip = {
  skip: true;
  skippedReason: string;
};

export type KaitenSyncProceed = {
  skip: false;
};

export type KaitenSyncGate = KaitenSyncSkip | KaitenSyncProceed;

export async function gateKaitenSyncForTenant(
  db: PrismaClient,
  tenantId: string,
): Promise<KaitenSyncGate> {
  const gate = await gateKaitenIntegration(db, tenantId);
  if (!gate.ok) {
    return { skip: true, skippedReason: gate.reason };
  }
  return { skip: false };
}
