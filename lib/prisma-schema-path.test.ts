import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolvePrismaSchemaPath } from "@/lib/prisma-schema-path";

describe("resolvePrismaSchemaPath", () => {
  it("находит schema.prisma в корне репозитория", () => {
    const p = resolvePrismaSchemaPath();
    expect(p).toBeTruthy();
    expect(existsSync(p!)).toBe(true);
    expect(path.basename(p!)).toBe("schema.prisma");
  });
});
