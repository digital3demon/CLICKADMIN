import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolveLocalPrismaCliJs } from "@/lib/demo-reset";

describe("resolveLocalPrismaCliJs", () => {
  it("finds prisma CLI from node_modules in this repo", () => {
    const js = resolveLocalPrismaCliJs();
    expect(js).toBeTruthy();
    expect(existsSync(js!)).toBe(true);
    expect(path.normalize(js!).replace(/\\/g, "/")).toMatch(
      /node_modules\/prisma\/build\/index\.js$/,
    );
  });
});
