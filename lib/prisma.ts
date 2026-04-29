import { PrismaClient } from "@prisma/client";
import { augmentSqliteDatasourceUrl } from "@/lib/sqlite-datasource-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function mainDatasourceUrl(): string | undefined {
  const u =
    process.env.CLIENTS_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!u) return undefined;
  return augmentSqliteDatasourceUrl(u);
}

const resolvedMainDbUrl = mainDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(resolvedMainDbUrl
      ? { datasources: { db: { url: resolvedMainDbUrl } } }
      : {}),
    transactionOptions: {
      maxWait: 30_000,
      timeout: 180_000,
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
