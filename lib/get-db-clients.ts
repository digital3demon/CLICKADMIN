import "server-only";

import type { PrismaClient } from "@prisma/client";
import { isDbSplitEnabled } from "@/lib/db-split";
import { getPrisma } from "@/lib/get-prisma";
import {
  getClientsPrismaClient,
  getOrdersPrismaClient,
  getPricingPrismaClient,
  getWarehousePrismaClient,
} from "@/lib/prisma-clients";

export type DbClients = {
  clients: PrismaClient;
  orders: PrismaClient;
  pricing: PrismaClient;
  warehouse: PrismaClient;
};

export async function getDbClients(): Promise<DbClients> {
  if (!isDbSplitEnabled()) {
    const one = await getPrisma();
    return {
      clients: one,
      orders: one,
      pricing: one,
      warehouse: one,
    };
  }
  return {
    clients: getClientsPrismaClient(),
    orders: getOrdersPrismaClient(),
    pricing: getPricingPrismaClient(),
    warehouse: getWarehousePrismaClient(),
  };
}

