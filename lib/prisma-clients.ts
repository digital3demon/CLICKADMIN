import "server-only";

import { PrismaClient } from "@prisma/client";
import { augmentSqliteDatasourceUrl } from "@/lib/sqlite-datasource-url";

type Domain = "clients" | "orders" | "pricing" | "warehouse";

type GlobalPrismaClients = {
  clientsPrisma?: PrismaClient;
  ordersPrisma?: PrismaClient;
  pricingPrisma?: PrismaClient;
  warehousePrisma?: PrismaClient;
};

const g = globalThis as unknown as GlobalPrismaClients;

function resolvedUrl(domain: Domain): string | undefined {
  const fromSplit = (() => {
    if (domain === "clients") return process.env.CLIENTS_DATABASE_URL;
    if (domain === "orders") return process.env.ORDERS_DATABASE_URL;
    if (domain === "pricing") return process.env.PRICING_DATABASE_URL;
    return process.env.WAREHOUSE_DATABASE_URL;
  })();
  const fallback = process.env.DATABASE_URL;
  const raw = String(fromSplit ?? fallback ?? "").trim();
  if (!raw) return undefined;
  return augmentSqliteDatasourceUrl(raw);
}

function makeClient(domain: Domain): PrismaClient {
  const url = resolvedUrl(domain);
  return new PrismaClient({
    log: ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
    transactionOptions: {
      maxWait: 30_000,
      timeout: 180_000,
    },
  });
}

export function getClientsPrismaClient(): PrismaClient {
  if (!g.clientsPrisma) g.clientsPrisma = makeClient("clients");
  return g.clientsPrisma;
}

export function getOrdersPrismaClient(): PrismaClient {
  if (!g.ordersPrisma) g.ordersPrisma = makeClient("orders");
  return g.ordersPrisma;
}

export function getPricingPrismaClient(): PrismaClient {
  if (!g.pricingPrisma) g.pricingPrisma = makeClient("pricing");
  return g.pricingPrisma;
}

export function getWarehousePrismaClient(): PrismaClient {
  if (!g.warehousePrisma) g.warehousePrisma = makeClient("warehouse");
  return g.warehousePrisma;
}

