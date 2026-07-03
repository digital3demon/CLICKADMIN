/** Единые result-типы facade интеграции Kaiten. */

export const KAITEN_INTEGRATION_DISABLED_CODE = "KAITEN_INTEGRATION_DISABLED" as const;

export type KaitenIntegrationDisabledReason =
  | typeof KAITEN_INTEGRATION_DISABLED_CODE
  | "KAITEN_ENV_NOT_CONFIGURED"
  | "KAITEN_REENABLE_IN_PROGRESS";

export type KaitenIntegrationGateOk = {
  ok: true;
  enabled: true;
};

export type KaitenIntegrationGateDisabled = {
  ok: false;
  enabled: false;
  reason: KaitenIntegrationDisabledReason;
  message: string;
};

export type KaitenIntegrationGateResult =
  | KaitenIntegrationGateOk
  | KaitenIntegrationGateDisabled;

export type KaitenBackfillStatus = "idle" | "running" | "failed" | "completed";

export type KaitenIntegrationBackfillState = {
  status: KaitenBackfillStatus;
  startedAt?: string;
  finishedAt?: string;
  disabledFrom?: string;
  lastError?: string | null;
  cursorOrderId?: string | null;
  total?: number;
  processed?: number;
  cardsCreated?: number;
  commentsSynced?: number;
  filesSynced?: number;
  positionsSynced?: number;
  failed?: number;
};

export type KaitenIntegrationTenantState = {
  enabled: boolean;
  disabledAt: string | null;
  disabledByUserId: string | null;
  envConfigured: boolean;
  /** Интеграция активна для outbound/inbound sync (enabled + env + не идёт re-enable). */
  active: boolean;
  reenableInProgress: boolean;
  backfill: KaitenIntegrationBackfillState;
};
