import { describe, expect, it } from "vitest";
import {
  formatPgToolSpawnError,
  pgToolCandidatePaths,
  resolvePgToolPath,
} from "./resolve-pg-tool";

describe("resolvePgToolPath", () => {
  it("env первым, кириллица в PG_DUMP_PATH не теряется", () => {
    const p = resolvePgToolPath("pg_dump", {
      env: { PG_DUMP_PATH: "/opt/данные/pg_dump" },
      exists: () => false,
    });
    expect(p).toBe("/opt/данные/pg_dump");
  });

  it("Linux: /usr/local/bin раньше PATH-имени", () => {
    const p = resolvePgToolPath("pg_dump", {
      env: {},
      platform: "linux",
      exists: (filePath) => filePath === "/usr/local/bin/pg_dump",
    });
    expect(p).toBe("/usr/local/bin/pg_dump");
    expect(pgToolCandidatePaths("pg_dump", "linux")[0]).toBe(
      "/usr/local/bin/pg_dump",
    );
  });

  it("ENOENT — явная подсказка про PG_DUMP_PATH", () => {
    const msg = formatPgToolSpawnError("pg_dump", "pg_dump", {
      error: Object.assign(new Error("not found"), { code: "ENOENT" }),
    });
    expect(msg).toContain("Не найден pg_dump");
    expect(msg).toContain("PG_DUMP_PATH");
  });
});
