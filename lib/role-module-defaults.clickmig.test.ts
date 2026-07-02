import { describe, expect, it } from "vitest";
import {
  CLICKMIG_OWNER_ONLY_MODULES,
  defaultModuleAllowed,
  isClickMigOwnerOnlyModule,
} from "./role-module-defaults";

describe("ClickMig owner-only defaults", () => {
  it("не выдаёт КликМиг ролям кроме OWNER по дефолту", () => {
    for (const module of CLICKMIG_OWNER_ONLY_MODULES) {
      expect(defaultModuleAllowed("ADMINISTRATOR", module)).toBe(false);
      expect(defaultModuleAllowed("MANAGER", module)).toBe(false);
      expect(defaultModuleAllowed("OWNER", module)).toBe(true);
    }
  });

  it("isClickMigOwnerOnlyModule распознаёт все модули контура", () => {
    expect(isClickMigOwnerOnlyModule("CLICKMIG")).toBe(true);
    expect(isClickMigOwnerOnlyModule("ORDERS")).toBe(false);
  });
});
