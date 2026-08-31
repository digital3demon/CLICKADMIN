import { describe, expect, it } from "vitest";
import { isKaitenIntegrationDisabledResponse } from "@/lib/kanban/kaiten-client-disabled";
import { KAITEN_INTEGRATION_DISABLED_CODE } from "@/lib/kaiten-integration/types";

describe("isKaitenIntegrationDisabledResponse", () => {
  it("409 + флаг — тихий skip", () => {
    expect(
      isKaitenIntegrationDisabledResponse(409, {
        kaitenIntegrationEnabled: false,
      }),
    ).toBe(true);
  });

  it("409 + код выключения, кириллица в error не мешает", () => {
    expect(
      isKaitenIntegrationDisabledResponse(409, {
        code: KAITEN_INTEGRATION_DISABLED_CODE,
        kaitenIntegrationEnabled: false,
      }),
    ).toBe(true);
    expect(
      isKaitenIntegrationDisabledResponse(409, {
        code: "KAITEN_ENV_NOT_CONFIGURED",
      }),
    ).toBe(true);
  });

  it("обычная ошибка Kaiten — не skip", () => {
    expect(
      isKaitenIntegrationDisabledResponse(503, { code: "KAITEN_ENV_NOT_CONFIGURED" }),
    ).toBe(false);
    expect(isKaitenIntegrationDisabledResponse(409, { error: "колонка Тындик" })).toBe(
      false,
    );
  });
});
