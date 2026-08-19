import "server-only";

import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { augmentDatasourceUrl } from "@/lib/sqlite-datasource-url";

/**
 * Где лежат коды входа в общее демо (без тенанта).
 * По умолчанию — основная DATABASE_URL.
 * Для отдельного процесса demo.click-lab: DEMO_ACCESS_DATABASE_URL → та же Postgres,
 * где OWNER генерирует коды в Конфигурации.
 */
const globalForDemoAccess = globalThis as unknown as {
  demoAccessPrisma?: PrismaClient;
};

function demoAccessDatasourceUrl(): string | undefined {
  const dedicated = process.env.DEMO_ACCESS_DATABASE_URL?.trim();
  if (dedicated) return augmentDatasourceUrl(dedicated);
  return undefined;
}

export function getDemoAccessPrisma(): PrismaClient {
  const dedicated = demoAccessDatasourceUrl();
  if (!dedicated) return prisma;

  if (!globalForDemoAccess.demoAccessPrisma) {
    globalForDemoAccess.demoAccessPrisma = new PrismaClient({
      log: ["error"],
      datasources: { db: { url: dedicated } },
      transactionOptions: {
        maxWait: 30_000,
        timeout: 60_000,
      },
    });
  }
  return globalForDemoAccess.demoAccessPrisma;
}
