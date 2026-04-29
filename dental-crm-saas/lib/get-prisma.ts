import "server-only";

import { cookies } from "next/headers";
import type { PrismaClient } from "@prisma/client";
import {
  SESSION_DEMO_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/jwt";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { ensureOrderAttachmentDiskRelPathColumn } from "@/lib/ensure-order-attachment-disk-column";
import { getDemoPrisma } from "@/lib/prisma-demo";
import { prisma } from "@/lib/prisma";

/**
 * Клиент БД для текущего запроса: основная CRM или изолированная демо-БД.
 * Сначала читаем демо-cookie напрямую (как в middleware), затем сессию —
 * чтобы не попасть в основную БД при любом расхождении путей чтения cookie.
 */
export async function getPrisma(): Promise<PrismaClient> {
  let client: PrismaClient;
  try {
    const c = await cookies();
    const demoT = c.get(SESSION_DEMO_COOKIE_NAME)?.value;
    if (demoT) {
      const d = await verifySessionToken(demoT);
      if (d?.demo) {
        client = getDemoPrisma();
        await ensureOrderAttachmentDiskRelPathColumn(client);
        return client;
      }
    }
  } catch {
    /* cookies() недоступен вне запроса — ниже fallback по getSessionFromCookies */
  }

  const session = await getSessionFromCookies();
  if (session?.demo) {
    client = getDemoPrisma();
    await ensureOrderAttachmentDiskRelPathColumn(client);
    return client;
  }
  client = prisma;
  await ensureOrderAttachmentDiskRelPathColumn(client);
  return client;
}
