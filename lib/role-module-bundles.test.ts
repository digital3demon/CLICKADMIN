import { describe, expect, it } from "vitest";
import type { AppModule } from "@prisma/client";
import {
  BUNDLE_TO_ATOMIC,
  collapseToBundles,
  expandBundles,
  inferBundleEnabledFromAtoms,
  isBundleEnabled,
} from "@/lib/role-module-bundles";
import { defaultModuleAllowed } from "@/lib/role-module-defaults";

function accessMap(pairs: Array<[AppModule, boolean]>): Record<AppModule, boolean> {
  const out = {} as Record<AppModule, boolean>;
  for (const [m, v] of pairs) out[m] = v;
  return out;
}

describe("role-module-bundles", () => {
  it("KANBAN_WORK пакет раскрывается из одного atomic", () => {
    const raw = accessMap([["KANBAN_MOVE_COLUMNS", true]]);
    const expanded = expandBundles(raw);
    for (const m of BUNDLE_TO_ATOMIC.KANBAN_WORK) {
      expect(expanded[m]).toBe(true);
    }
    expect(expanded.KANBAN).toBe(true);
  });

  it("KANBAN_COORDINATE включает WORK и базовый KANBAN", () => {
    const raw = accessMap([["KANBAN_EDIT_TITLE", true]]);
    const expanded = expandBundles(raw);
    expect(expanded.KANBAN_DELETE_CARD).toBe(true);
    expect(expanded.KANBAN_ATTACH_FILES).toBe(true);
    expect(expanded.KANBAN).toBe(true);
  });

  it("collapseToBundles мигрирует granular overrides", () => {
    const raw = accessMap([
      ["KANBAN_CARD_CHAT", true],
      ["KANBAN_MOVE_COLUMNS", true],
    ]);
    const bundles = collapseToBundles(raw);
    expect(bundles.KANBAN).toBe(true);
    expect(bundles.KANBAN_WORK).toBe(true);
    expect(bundles.KANBAN_COORDINATE).toBe(false);
  });

  it("ORDERS пакет включает ORDERS_CHAT", () => {
    const raw = accessMap([["ORDERS", true], ["ORDERS_CHAT", true]]);
    expect(isBundleEnabled(raw, "ORDERS")).toBe(true);
    expect(inferBundleEnabledFromAtoms(accessMap([["ORDERS_CHAT", true]]), "ORDERS")).toBe(
      true,
    );
  });
});

describe("defaultModuleAllowed bundles alignment", () => {
  it("USER: KANBAN_WORK без COORDINATE и без ORDERS", () => {
    expect(defaultModuleAllowed("USER", "KANBAN_ATTACH_FILES")).toBe(true);
    expect(defaultModuleAllowed("USER", "KANBAN_MANAGE_ASSIGNEES")).toBe(true);
    expect(defaultModuleAllowed("USER", "KANBAN_MANAGE_PARTICIPANTS")).toBe(true);
    expect(defaultModuleAllowed("USER", "KANBAN_DELETE_CARD")).toBe(false);
    expect(defaultModuleAllowed("USER", "ORDERS")).toBe(false);
    expect(defaultModuleAllowed("USER", "ORDERS_NOTIFICATIONS_ADMIN")).toBe(false);
    expect(defaultModuleAllowed("USER", "ORDERS_NOTIFICATIONS_CORRECTIONS")).toBe(
      false,
    );
    expect(defaultModuleAllowed("USER", "ORDERS_NOTIFICATIONS_PROSTHETICS")).toBe(
      false,
    );
  });

  it("PRODUCTION: ответственные и участники на доске", () => {
    expect(defaultModuleAllowed("PRODUCTION", "KANBAN_MANAGE_ASSIGNEES")).toBe(true);
    expect(defaultModuleAllowed("PRODUCTION", "KANBAN_MANAGE_PARTICIPANTS")).toBe(
      true,
    );
    expect(defaultModuleAllowed("SENIOR_PRODUCTION", "KANBAN_MANAGE_ASSIGNEES")).toBe(
      true,
    );
    expect(defaultModuleAllowed("PRODUCTION", "KANBAN_DELETE_CARD")).toBe(false);
  });

  it("SENIOR_TECHNICIAN: полный канбан, без заказов и тостов по нарядам", () => {
    expect(defaultModuleAllowed("SENIOR_TECHNICIAN", "KANBAN_DELETE_CARD")).toBe(true);
    expect(defaultModuleAllowed("SENIOR_TECHNICIAN", "ORDERS")).toBe(false);
    expect(defaultModuleAllowed("SENIOR_TECHNICIAN", "ORDERS_NOTIFICATIONS_ADMIN")).toBe(
      false,
    );
    expect(
      defaultModuleAllowed("SENIOR_TECHNICIAN", "ORDERS_NOTIFICATIONS_CORRECTIONS"),
    ).toBe(false);
    expect(
      defaultModuleAllowed("SENIOR_TECHNICIAN", "ORDERS_NOTIFICATIONS_PROSTHETICS"),
    ).toBe(false);
  });

  it("FINANCE_OFFICE: бухгалтер, финменеджер, админы и руководитель", () => {
    expect(defaultModuleAllowed("ACCOUNTANT", "FINANCE_OFFICE")).toBe(true);
    expect(defaultModuleAllowed("FINANCIAL_MANAGER", "FINANCE_OFFICE")).toBe(
      true,
    );
    expect(defaultModuleAllowed("ADMINISTRATOR", "FINANCE_OFFICE")).toBe(true);
    expect(defaultModuleAllowed("SENIOR_ADMINISTRATOR", "FINANCE_OFFICE")).toBe(
      true,
    );
    expect(defaultModuleAllowed("MANAGER", "FINANCE_OFFICE")).toBe(true);
    expect(defaultModuleAllowed("USER", "FINANCE_OFFICE")).toBe(false);
  });

  it("MANAGER: заказы + канбан + все типы уведомлений по нарядам", () => {
    expect(defaultModuleAllowed("MANAGER", "ORDERS")).toBe(true);
    expect(defaultModuleAllowed("MANAGER", "ORDERS_CREATE")).toBe(true);
    expect(defaultModuleAllowed("MANAGER", "KANBAN_DELETE_CARD")).toBe(true);
    expect(defaultModuleAllowed("MANAGER", "ORDERS_NOTIFICATIONS_ADMIN")).toBe(true);
    expect(defaultModuleAllowed("MANAGER", "ORDERS_NOTIFICATIONS_CORRECTIONS")).toBe(
      true,
    );
    expect(defaultModuleAllowed("MANAGER", "ORDERS_NOTIFICATIONS_PROSTHETICS")).toBe(
      true,
    );
  });

  it("expandBundles: любой тип уведомлений поднимает legacy ORDERS_NOTIFICATIONS", () => {
    const expanded = expandBundles(
      accessMap([["ORDERS_NOTIFICATIONS_CORRECTIONS", true]]),
    );
    expect(expanded.ORDERS_NOTIFICATIONS_CORRECTIONS).toBe(true);
    expect(expanded.ORDERS_NOTIFICATIONS).toBe(true);
    expect(expanded.ORDERS_NOTIFICATIONS_ADMIN).toBeUndefined();
  });

  it("AI_MODE: только старший админ по умолчанию, не обычный админ", () => {
    expect(defaultModuleAllowed("ADMINISTRATOR", "AI_MODE")).toBe(false);
    expect(defaultModuleAllowed("SENIOR_ADMINISTRATOR", "AI_MODE")).toBe(true);
    expect(defaultModuleAllowed("ADMINISTRATOR", "AI_ADMIN")).toBe(false);
  });

  it("примеры работ выкл, протоколы вкл у всех кроме владельца (он и так всё)", () => {
    expect(defaultModuleAllowed("USER", "WORK_EXAMPLES")).toBe(false);
    expect(defaultModuleAllowed("SENIOR_TECHNICIAN", "WORK_EXAMPLES")).toBe(false);
    expect(defaultModuleAllowed("ADMINISTRATOR", "WORK_EXAMPLES")).toBe(false);
    expect(defaultModuleAllowed("OWNER", "WORK_EXAMPLES")).toBe(true);
    expect(defaultModuleAllowed("USER", "PROTOCOLS_REFS")).toBe(true);
    expect(defaultModuleAllowed("PRODUCTION", "PROTOCOLS_REFS")).toBe(true);
  });
});
