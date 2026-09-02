/** Признаки видимости Kaiten UI (server-safe). */
import type { UserRole } from "@prisma/client";
import type { KaitenIntegrationTenantState } from "@/lib/kaiten-integration/types";

export function showKaitenUi(state: KaitenIntegrationTenantState): boolean {
  return state.active || state.reenableInProgress;
}

/** Кнопка «Обновить» с Kaiten — только владелец, при живой интеграции, не в демо. */
export function showKanbanKaitenRefreshButton(input: {
  isDemo: boolean;
  kaitenIntegrationActive: boolean;
  sessionRole?: UserRole | string | null;
}): boolean {
  return (
    !input.isDemo &&
    input.kaitenIntegrationActive &&
    input.sessionRole === "OWNER"
  );
}

/** Legacy read-only: старые kaitenCardId / поля можно показывать при выключенной интеграции. */
export function showLegacyKaitenData(
  state: KaitenIntegrationTenantState,
  hasLegacyKaitenLink: boolean,
): boolean {
  if (showKaitenUi(state)) return true;
  return hasLegacyKaitenLink;
}

export function kaitenUiDisabledReason(
  state: KaitenIntegrationTenantState,
): string | null {
  if (state.active) return null;
  if (state.reenableInProgress) {
    return "Идёт догоняющая синхронизация с Kaiten…";
  }
  if (!state.enabled) {
    return "Интеграция с Kaiten выключена. Работа ведётся в CRM и канбане.";
  }
  if (!state.envConfigured) {
    return "Kaiten не настроен на сервере.";
  }
  return null;
}
