/**
 * Единые проверки enabled/disabled и типовые ответы для API и sync entrypoints.
 */
import type { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { isCrmStandaloneDemo } from "@/lib/crm-standalone-demo";
import {
  isKaitenEnvConfigured,
  loadKaitenIntegrationTenantState,
} from "@/lib/kaiten-integration/settings";
import {
  KAITEN_INTEGRATION_DISABLED_CODE,
  type KaitenIntegrationGateResult,
} from "@/lib/kaiten-integration/types";

export function kaitenIntegrationDisabledMessage(reason: string): string {
  if (reason === KAITEN_INTEGRATION_DISABLED_CODE) {
    return "Интеграция с Kaiten выключена. Работа продолжается в CRM и канбане.";
  }
  if (reason === "KAITEN_REENABLE_IN_PROGRESS") {
    return "Идёт догоняющая синхронизация с Kaiten. Подождите завершения.";
  }
  return "Kaiten не настроен на сервере (KAITEN_API_TOKEN и доски).";
}

export async function gateKaitenIntegration(
  db: PrismaClient,
  tenantId: string,
): Promise<KaitenIntegrationGateResult> {
  if (isCrmStandaloneDemo()) {
    return {
      ok: false,
      enabled: false,
      reason: KAITEN_INTEGRATION_DISABLED_CODE,
      message: "В демо-версии Kaiten отключён.",
    };
  }
  const state = await loadKaitenIntegrationTenantState(db, tenantId);
  if (state.reenableInProgress) {
    return { ok: true, enabled: true };
  }
  if (!state.enabled) {
    return {
      ok: false,
      enabled: false,
      reason: KAITEN_INTEGRATION_DISABLED_CODE,
      message: kaitenIntegrationDisabledMessage(KAITEN_INTEGRATION_DISABLED_CODE),
    };
  }
  if (!isKaitenEnvConfigured()) {
    return {
      ok: false,
      enabled: false,
      reason: "KAITEN_ENV_NOT_CONFIGURED",
      message: kaitenIntegrationDisabledMessage("KAITEN_ENV_NOT_CONFIGURED"),
    };
  }
  return { ok: true, enabled: true };
}

/** Для ручных Kaiten API routes — 409 с понятной причиной. */
export function kaitenIntegrationDisabledResponse(
  gate: Extract<KaitenIntegrationGateResult, { ok: false }>,
): NextResponse {
  return NextResponse.json(
    {
      error: gate.message,
      code: gate.reason,
      kaitenIntegrationEnabled: false,
    },
    { status: 409 },
  );
}

/** Для фоновых sync — no-op без ошибки. */
export function kaitenBackgroundSyncSkipped(input: {
  reason: string;
}): {
  skipped: true;
  skippedReason: string;
  syncedOrderCount: number;
  rateLimited: boolean;
} {
  return {
    skipped: true,
    skippedReason: input.reason,
    syncedOrderCount: 0,
    rateLimited: false,
  };
}
