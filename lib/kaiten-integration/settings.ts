/**
 * Tenant-level состояние интеграции Kaiten + durable backfill progress.
 * Backfill хранится в TenantClientState (ключ `kaitenIntegrationBackfillV1`).
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { getKaitenEnvConfig, isKaitenTokenPresent } from "@/lib/kaiten-config";
import type {
  KaitenIntegrationBackfillState,
  KaitenIntegrationTenantState,
} from "@/lib/kaiten-integration/types";

export const KAITEN_INTEGRATION_BACKFILL_KEY = "kaitenIntegrationBackfillV1";

export type TenantKaitenIntegrationRow = {
  kaitenIntegrationEnabled: boolean;
  kaitenIntegrationDisabledAt: Date | null;
  kaitenIntegrationDisabledByUserId: string | null;
};

export const tenantKaitenIntegrationSelect = {
  kaitenIntegrationEnabled: true,
  kaitenIntegrationDisabledAt: true,
  kaitenIntegrationDisabledByUserId: true,
} as const;

function isTenantClientStateMissing(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const obj = err as { code?: string; message?: string; meta?: { table?: string } };
  return (
    obj.code === "P2021" &&
    (obj.meta?.table === "public.TenantClientState" ||
      obj.meta?.table === "TenantClientState" ||
      String(obj.message || "").includes("TenantClientState"))
  );
}

const memoryBackfillByTenant = new Map<string, KaitenIntegrationBackfillState>();

export function parseKaitenIntegrationBackfillState(
  value: Prisma.JsonValue | null | undefined,
): KaitenIntegrationBackfillState {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { status: "idle" };
  }
  const obj = value as Record<string, unknown>;
  const statusRaw = obj.status;
  const status =
    statusRaw === "running" ||
    statusRaw === "failed" ||
    statusRaw === "completed" ||
    statusRaw === "idle"
      ? statusRaw
      : "idle";
  const num = (k: string) =>
    typeof obj[k] === "number" && Number.isFinite(obj[k])
      ? (obj[k] as number)
      : undefined;
  return {
    status,
    startedAt: typeof obj.startedAt === "string" ? obj.startedAt : undefined,
    finishedAt: typeof obj.finishedAt === "string" ? obj.finishedAt : undefined,
    disabledFrom:
      typeof obj.disabledFrom === "string" ? obj.disabledFrom : undefined,
    lastError:
      obj.lastError == null
        ? null
        : typeof obj.lastError === "string"
          ? obj.lastError
          : String(obj.lastError),
    cursorOrderId:
      typeof obj.cursorOrderId === "string" ? obj.cursorOrderId : null,
    total: num("total"),
    processed: num("processed"),
    cardsCreated: num("cardsCreated"),
    commentsSynced: num("commentsSynced"),
    filesSynced: num("filesSynced"),
    positionsSynced: num("positionsSynced"),
    failed: num("failed"),
  };
}

export async function readKaitenIntegrationBackfillState(
  db: PrismaClient,
  tenantId: string,
): Promise<{ state: KaitenIntegrationBackfillState; persistent: boolean }> {
  try {
    const row = await db.tenantClientState.findUnique({
      where: {
        tenantId_key: { tenantId, key: KAITEN_INTEGRATION_BACKFILL_KEY },
      },
      select: { value: true },
    });
    return {
      state: parseKaitenIntegrationBackfillState(row?.value),
      persistent: true,
    };
  } catch (err) {
    if (!isTenantClientStateMissing(err)) throw err;
    return {
      state: memoryBackfillByTenant.get(tenantId) ?? { status: "idle" },
      persistent: false,
    };
  }
}

export async function writeKaitenIntegrationBackfillState(
  db: PrismaClient,
  tenantId: string,
  state: KaitenIntegrationBackfillState,
  persistent: boolean,
): Promise<void> {
  if (!persistent) {
    memoryBackfillByTenant.set(tenantId, state);
    return;
  }
  await db.tenantClientState.upsert({
    where: {
      tenantId_key: { tenantId, key: KAITEN_INTEGRATION_BACKFILL_KEY },
    },
    create: { tenantId, key: KAITEN_INTEGRATION_BACKFILL_KEY, value: state },
    update: { value: state },
  });
}

export function isKaitenEnvConfigured(): boolean {
  return isKaitenTokenPresent() && getKaitenEnvConfig() != null;
}

export function buildKaitenIntegrationTenantState(input: {
  tenant: TenantKaitenIntegrationRow;
  backfill: KaitenIntegrationBackfillState;
}): KaitenIntegrationTenantState {
  const envConfigured = isKaitenEnvConfigured();
  const reenableInProgress = input.backfill.status === "running";
  const enabled = input.tenant.kaitenIntegrationEnabled;
  /** Outbound разрешён: обычный режим или догоняющая синхронизация при повторном включении. */
  const active =
    envConfigured &&
    ((enabled && !reenableInProgress) || reenableInProgress);
  return {
    enabled,
    disabledAt: input.tenant.kaitenIntegrationDisabledAt?.toISOString() ?? null,
    disabledByUserId: input.tenant.kaitenIntegrationDisabledByUserId,
    envConfigured,
    active,
    reenableInProgress,
    backfill: input.backfill,
  };
}

export async function loadKaitenIntegrationTenantState(
  db: PrismaClient,
  tenantId: string,
): Promise<KaitenIntegrationTenantState> {
  const [tenant, backfillRead] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: tenantKaitenIntegrationSelect,
    }),
    readKaitenIntegrationBackfillState(db, tenantId),
  ]);
  if (!tenant) {
    return buildKaitenIntegrationTenantState({
      tenant: {
        kaitenIntegrationEnabled: true,
        kaitenIntegrationDisabledAt: null,
        kaitenIntegrationDisabledByUserId: null,
      },
      backfill: backfillRead.state,
    });
  }
  return buildKaitenIntegrationTenantState({
    tenant,
    backfill: backfillRead.state,
  });
}

/** Outbound/inbound Kaiten sync разрешён для tenant. */
export async function isKaitenIntegrationActive(
  db: PrismaClient,
  tenantId: string,
): Promise<boolean> {
  const state = await loadKaitenIntegrationTenantState(db, tenantId);
  return state.active;
}
