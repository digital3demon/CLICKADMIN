import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";

export type DbClients = {
  clients: PrismaClient;
  orders: PrismaClient;
  pricing: PrismaClient;
  warehouse: PrismaClient;
};

/**
 * Единая граница БД для бизнес-кода.
 *
 * В личной CRM это один default tenant в общей БД. В SaaS этот helper сначала
 * проходит через `getPrisma()` и уже там выбирает shared/tenant database.
 * Новые API не должны напрямую создавать отдельные PrismaClient по DATABASE_URL.
 */
export async function getDbClients(): Promise<DbClients> {
  const one = await getPrisma();
  return {
    clients: one,
    orders: one,
    pricing: one,
    warehouse: one,
  };
}

