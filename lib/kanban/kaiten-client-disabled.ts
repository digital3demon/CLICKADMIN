/**
 * Ответ исходящего PATCH/GET Kaiten, когда интеграция выключена.
 * Канбан CRM уже сохранён — клиент не показывает тост и не откатывает карточку.
 */
import { KAITEN_INTEGRATION_DISABLED_CODE } from "@/lib/kaiten-integration/types";

export function isKaitenIntegrationDisabledResponse(
  status: number,
  data: { kaitenIntegrationEnabled?: boolean; code?: string },
): boolean {
  if (status !== 409) return false;
  if (data.kaitenIntegrationEnabled === false) return true;
  return (
    data.code === KAITEN_INTEGRATION_DISABLED_CODE ||
    data.code === "KAITEN_ENV_NOT_CONFIGURED"
  );
}
