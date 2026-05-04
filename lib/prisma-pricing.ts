import { PrismaClient } from "@prisma/client";
import { augmentSqliteDatasourceUrl } from "@/lib/sqlite-datasource-url";

/**
 * Legacy sync-клиент для старых price/inventory handlers.
 * Новый серверный код должен брать `pricing` через `getPricingPrisma()` /
 * `getDbClients()`, чтобы lab CRM и SaaS tenant routing не расходились.
 */
const g = globalThis as unknown as {
  pricingPrisma?: PrismaClient;
};

export function getPricingDatabaseUrl(): string {
  const u = process.env.DATABASE_URL?.trim();
  return augmentSqliteDatasourceUrl(u || "file:./dev.db");
}

export function getPricingPrismaClient(): PrismaClient {
  if (!g.pricingPrisma) {
    g.pricingPrisma = new PrismaClient({
      log: ["error"],
      datasources: { db: { url: getPricingDatabaseUrl() } },
      transactionOptions: {
        maxWait: 30_000,
        timeout: 180_000,
      },
    });
  }
  return g.pricingPrisma;
}

