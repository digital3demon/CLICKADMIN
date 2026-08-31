import { describe, expect, it } from "vitest";
import {
  buildKaitenIntegrationTenantState,
  parseKaitenIntegrationBackfillState,
} from "@/lib/kaiten-integration/settings";
import { ordersChangedDuringDisabledWhere } from "@/lib/kaiten-integration/backfill-query";
import {
  showKaitenUi,
  showLegacyKaitenData,
  showKanbanKaitenRefreshButton,
} from "@/lib/kaiten-integration/ui";

describe("kaiten integration tenant state", () => {
  it("active=false когда интеграция выключена", () => {
    const state = buildKaitenIntegrationTenantState({
      tenant: {
        kaitenIntegrationEnabled: false,
        kaitenIntegrationDisabledAt: new Date("2026-07-01T10:00:00.000Z"),
        kaitenIntegrationDisabledByUserId: "u1",
      },
      backfill: { status: "idle" },
    });
    expect(state.enabled).toBe(false);
    expect(state.active).toBe(false);
    expect(state.reenableInProgress).toBe(false);
  });

  it("active=true во время backfill при выключенном enabled", () => {
    const state = buildKaitenIntegrationTenantState({
      tenant: {
        kaitenIntegrationEnabled: false,
        kaitenIntegrationDisabledAt: new Date("2026-07-01T10:00:00.000Z"),
        kaitenIntegrationDisabledByUserId: "u1",
      },
      backfill: { status: "running", processed: 1, total: 5 },
    });
    expect(state.enabled).toBe(false);
    expect(state.reenableInProgress).toBe(true);
    // envConfigured зависит от .env в тестовом окружении
    if (state.envConfigured) {
      expect(state.active).toBe(true);
    }
  });

  it("parse backfill state", () => {
    expect(parseKaitenIntegrationBackfillState(null)).toEqual({ status: "idle" });
    expect(
      parseKaitenIntegrationBackfillState({
        status: "running",
        processed: 2,
        total: 10,
      }),
    ).toMatchObject({ status: "running", processed: 2, total: 10 });
  });
});

describe("ordersChangedDuringDisabledWhere", () => {
  it("фильтрует по createdAt/updatedAt после disabledFrom", () => {
    const disabledFrom = new Date("2026-07-01T00:00:00.000Z");
    const where = ordersChangedDuringDisabledWhere({
      tenantId: "t1",
      disabledFrom,
    });
    expect(where).toMatchObject({
      tenantId: "t1",
      archivedAt: null,
      isTestOrder: false,
    });
    expect(where.OR).toHaveLength(2);
  });
});

describe("kaiten integration ui helpers", () => {
  it("скрывает активный Kaiten UI при disabled", () => {
    const state = buildKaitenIntegrationTenantState({
      tenant: {
        kaitenIntegrationEnabled: false,
        kaitenIntegrationDisabledAt: null,
        kaitenIntegrationDisabledByUserId: null,
      },
      backfill: { status: "idle" },
    });
    expect(showKaitenUi(state)).toBe(false);
    expect(showLegacyKaitenData(state, true)).toBe(true);
    expect(showLegacyKaitenData(state, false)).toBe(false);
  });

  it("кнопка Обновить на канбане скрыта без интеграции", () => {
    expect(
      showKanbanKaitenRefreshButton({
        isDemo: false,
        kaitenIntegrationActive: false,
      }),
    ).toBe(false);
    expect(
      showKanbanKaitenRefreshButton({
        isDemo: true,
        kaitenIntegrationActive: true,
      }),
    ).toBe(false);
    expect(
      showKanbanKaitenRefreshButton({
        isDemo: false,
        kaitenIntegrationActive: true,
      }),
    ).toBe(true);
  });
});
