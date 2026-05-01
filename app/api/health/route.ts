import { access } from "fs/promises";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

/**
 * Liveness / readiness: БД, доступ к cwd (файловая система процесса).
 * Кэш Redis в проекте не используется — поле cache: "not_configured".
 */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, "ok" | "fail" | "not_configured"> = {
    database: "fail",
    filesystem: "fail",
    cache: "not_configured",
  };

  const dbTimeoutMs = 4000;
  try {
    await Promise.race([
      (async () => {
        const prisma = await getPrisma();
        await prisma.$queryRaw(Prisma.sql`SELECT 1`);
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("health_db_timeout")), dbTimeoutMs),
      ),
    ]);
    checks.database = "ok";
  } catch (e) {
    logger.error({ err: e, msg: "health_db_failed" }, "health check");
  }

  try {
    await access(process.cwd());
    checks.filesystem = "ok";
  } catch (e) {
    logger.error({ err: e, msg: "health_fs_failed" }, "health check");
  }

  const ok = checks.database === "ok" && checks.filesystem === "ok";
  const ms = Date.now() - started;

  logger.debug({ msg: "health_check", checks, ms });

  return NextResponse.json(
    {
      status: ok ? "healthy" : "unhealthy",
      checks,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
