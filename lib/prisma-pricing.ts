import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";

/**
 * Прайс / склад / материалы.
 * Всегда через `getPrisma()`, чтобы демо-сессия читала schema `crm_demo`,
 * а не прод `DATABASE_URL` (раньше здесь был отдельный клиент — отсюда «мой склад» в демо).
 */
export async function getPricingPrismaClient(): Promise<PrismaClient> {
  return getPrisma();
}
