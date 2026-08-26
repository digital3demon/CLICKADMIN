import { describe, expect, it } from "vitest";
import { parseCrmBackupMeta } from "./types";

describe("parseCrmBackupMeta", () => {
  it("принимает валидный meta, кириллица в ключе не ломает", () => {
    expect(
      parseCrmBackupMeta({
        kind: "crm-full-backup",
        version: 1,
        engine: "sqlite",
        createdAt: "2026-08-26T21:00:00.000Z",
        source: "auto",
        tenantId: "t1",
        bytes: 12,
        storage: "disk",
        keyOrPath: "путь/бекап.zip",
      })?.keyOrPath,
    ).toBe("путь/бекап.zip");
    expect(parseCrmBackupMeta({ kind: "other" })).toBeNull();
  });
});
