import "server-only";

import { PrismaClient } from "@prisma/client";
import { augmentSqliteDatasourceUrl } from "@/lib/sqlite-datasource-url";
import { prisma as controlPrisma } from "@/lib/prisma";

type CachedTenantClient = {
  prisma: PrismaClient;
  lastUsedAt: number;
  dbUrl: string;
};

const MAX_TENANT_CLIENTS = 24;

const globalTenantCache = globalThis as unknown as {
  tenantPrismaClients?: Map<string, CachedTenantClient>;
};

function tenantClientCache(): Map<string, CachedTenantClient> {
  if (!globalTenantCache.tenantPrismaClients) {
    globalTenantCache.tenantPrismaClients = new Map();
  }
  return globalTenantCache.tenantPrismaClients;
}

function nowMs(): number {
  return Date.now();
}

function normalizeDbUrl(input: string): string {
  return augmentSqliteDatasourceUrl(input.trim());
}

async function evictIfNeeded(cache: Map<string, CachedTenantClient>): Promise<void> {
  if (cache.size < MAX_TENANT_CLIENTS) return;
  let oldestTenantId: string | null = null;
  let oldest = Number.POSITIVE_INFINITY;
  for (const [tenantId, item] of cache.entries()) {
    if (item.lastUsedAt < oldest) {
      oldest = item.lastUsedAt;
      oldestTenantId = tenantId;
    }
  }
  if (!oldestTenantId) return;
  const victim = cache.get(oldestTenantId);
  cache.delete(oldestTenantId);
  if (!victim) return;
  try {
    await victim.prisma.$disconnect();
  } catch {
    /* ignore */
  }
}

export type TenantDbRouting = {
  tenantId: string;
  dbUrl: string | null;
  enabled: boolean;
};

export async function getTenantDbRouting(
  tenantId: string,
): Promise<TenantDbRouting | null> {
  const row = await controlPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      tenantDatabaseEnabled: true,
      tenantDatabaseUrl: true,
    },
  });
  if (!row) return null;
  return {
    tenantId: row.id,
    enabled: row.tenantDatabaseEnabled === true,
    dbUrl: row.tenantDatabaseUrl?.trim() || null,
  };
}

export async function resolveTenantPrismaClient(
  tenantId: string,
): Promise<PrismaClient> {
  const routing = await getTenantDbRouting(tenantId);
  if (!routing || !routing.enabled || !routing.dbUrl) {
    return controlPrisma;
  }

  const cache = tenantClientCache();
  const existing = cache.get(tenantId);
  if (existing && existing.dbUrl === routing.dbUrl) {
    existing.lastUsedAt = nowMs();
    return existing.prisma;
  }

  if (existing && existing.dbUrl !== routing.dbUrl) {
    cache.delete(tenantId);
    try {
      await existing.prisma.$disconnect();
    } catch {
      /* ignore */
    }
  }

  await evictIfNeeded(cache);
  const dbUrl = normalizeDbUrl(routing.dbUrl);
  const prisma = new PrismaClient({
    log: ["error"],
    datasources: { db: { url: dbUrl } },
    transactionOptions: {
      maxWait: 30_000,
      timeout: 180_000,
    },
  });
  cache.set(tenantId, {
    prisma,
    dbUrl: routing.dbUrl,
    lastUsedAt: nowMs(),
  });
  return prisma;
}
