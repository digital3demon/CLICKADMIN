import path from "node:path";
import { describe, expect, it } from "vitest";
import { crmDumpDirCandidates } from "./local-dir";

describe("crmDumpDirCandidates", () => {
  it("env первым, standalone добавляет /app/data, кириллица в относительном пути", () => {
    const cwd = path.join("/app", ".next", "standalone");
    const list = crmDumpDirCandidates({
      cwd,
      envDir: "данные/дампы",
      tmpDir: "/tmp",
    });
    expect(list[0]).toBe(path.join(cwd, "данные/дампы"));
    expect(list).toContain("/app/data/crm-dumps");
    expect(list).toContain(path.resolve(cwd, "..", "..", "data", "crm-dumps"));
    expect(list).toContain(path.join(cwd, "data", "crm-dumps"));
    expect(list.at(-1)).toBe(path.join("/tmp", "dental-lab-crm-dumps"));
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
