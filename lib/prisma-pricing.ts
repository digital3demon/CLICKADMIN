import { PrismaClient } from "@prisma/client";
import { augmentSqliteDatasourceUrl } from "@/lib/sqlite-datasource-url";

const g = globalThis as unknown as {
  pricingPrisma?: PrismaClient;
};

export function getPricingDatabaseUrl(): string {
  const u =
    process.env.PRICING_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  return augmentSqliteDatasourceUrl(u || "file:./pricing.db");
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

