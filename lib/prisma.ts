import { PrismaClient } from "@prisma/client";
import { augmentDatasourceUrl } from "@/lib/sqlite-datasource-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function mainDatasourceUrl(): string | undefined {
  const u = process.env.DATABASE_URL?.trim();
  if (!u) return undefined;
  return augmentDatasourceUrl(u);
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

globalForPrisma.prisma = prisma;
