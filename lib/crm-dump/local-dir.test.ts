import path from "node:path";
import { describe, expect, it } from "vitest";
import { crmDumpDirCandidates, resolveCrmDumpEnvDir } from "./local-dir";

describe("crmDumpDirCandidates", () => {
  it("env первым, standalone не клеит data/ к cwd (EACCES), кириллица в относительном пути", () => {
    const cwd = path.join("/app", ".next", "standalone");
    const list = crmDumpDirCandidates({
      cwd,
      envDir: "данные/дампы",
      tmpDir: "/tmp",
    });
    expect(list[0]).toBe("/app/data/данные/дампы");
    expect(list).toContain("/app/data/crm-dumps");
    expect(list).toContain(path.resolve(cwd, "..", "..", "data", "crm-dumps"));
    expect(list).not.toContain(path.join(cwd, "data", "crm-dumps"));
    expect(list.at(-1)).toBe(path.join("/tmp", "dental-lab-crm-dumps"));
  });

  it("относительный CRM_DUMP_DIR=data/crm-dumps при standalone → /app/data", () => {
    const cwd = "/app/.next/standalone";
    expect(resolveCrmDumpEnvDir(cwd, "data/crm-dumps")).toBe(
      "/app/data/crm-dumps",
    );
    const list = crmDumpDirCandidates({
      cwd,
      envDir: "data/crm-dumps",
      tmpDir: "/tmp",
    });
    expect(list[0]).toBe("/app/data/crm-dumps");
    expect(list.some((p) => p.includes("/.next/standalone/data"))).toBe(false);
  });

  it("без env и без standalone — cwd/data затем tmp", () => {
    const cwd = "/home/lab";
    const list = crmDumpDirCandidates({
      cwd,
      tmpDir: "/tmp",
    });
    expect(list[0]).toBe("/app/data/crm-dumps");
    expect(list).toContain(path.join(cwd, "data", "crm-dumps"));
    expect(list.at(-1)).toBe(path.join("/tmp", "dental-lab-crm-dumps"));
  });
});
