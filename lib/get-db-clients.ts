import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";

export type DbClients = {
  clients: PrismaClient;
  orders: PrismaClient;
  pricing: PrismaClient;
  warehouse: PrismaClient;
};

export async function getDbClients(): Promise<DbClients> {
  const one = await getPrisma();
  return {
    clients: one,
    orders: one,
    pricing: one,
    warehouse: one,
  };
}

