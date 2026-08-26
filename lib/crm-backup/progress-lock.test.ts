import { describe, expect, it } from "vitest";
import { parseCrmMaintenanceState } from "./progress-lock";

describe("parseCrmMaintenanceState", () => {
  it("принимает backup/restore, кириллица в других полях не нужна", () => {
    expect(
      parseCrmMaintenanceState({
        phase: "backup",
        startedAt: new Date().toISOString(),
      })?.phase,
    ).toBe("backup");
    expect(
      parseCrmMaintenanceState({
        phase: "restore",
        startedAt: new Date().toISOString(),
      })?.phase,
    ).toBe("restore");
    expect(
      parseCrmMaintenanceState({
        phase: "backup",
        startedAt: "2010-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
  });
});
