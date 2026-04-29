import { PrismaClient } from "@prisma/client";
import { augmentSqliteDatasourceUrl } from "@/lib/sqlite-datasource-url";

const g = globalThis as unknown as {
  ordersPrisma?: PrismaClient;
};

export function getOrdersDatabaseUrl(): string {
  const u =
    process.env.ORDERS_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  return augmentSqliteDatasourceUrl(u || "file:./orders.db");
}

export function getOrdersPrismaClient(): PrismaClient {
  if (!g.ordersPrisma) {
    g.ordersPrisma = new PrismaClient({
      log: ["error"],
      datasources: { db: { url: getOrdersDatabaseUrl() } },
      transactionOptions: {
        maxWait: 30_000,
        timeout: 180_000,
      },
    });
  }
  return g.ordersPrisma;
}

