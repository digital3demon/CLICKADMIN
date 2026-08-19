import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Где лежит schema.prisma в runtime (репозиторий / standalone / App Platform).
 * На PaaS cwd часто = `.next/standalone` без копии prisma — тогда ищем рядом и выше.
 */
export function resolvePrismaSchemaPath(): string | null {
  const fromEnv = process.env.PRISMA_SCHEMA_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return path.resolve(fromEnv);

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "prisma", "schema.prisma"),
    path.join(cwd, "schema.prisma"),
    path.join(cwd, ".next", "standalone", "prisma", "schema.prisma"),
    path.join(cwd, "..", "prisma", "schema.prisma"),
    path.join(cwd, "..", "..", "prisma", "schema.prisma"),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return path.resolve(p);
  }
  return null;
}
