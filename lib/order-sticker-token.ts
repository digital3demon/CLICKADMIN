import "server-only";

import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";

function newStickerToken(): string {
  return randomBytes(16).toString("hex");
}

/** Уникальный токен для QR на этикетке (глобально уникален в таблице Order). */
export async function ensureStickerPublicTokenForOrder(
  db: PrismaClient,
  tenantId: string,
  orderId: string,
): Promise<string> {
  for (let i = 0; i < 12; i += 1) {
    const row = await db.order.findFirst({
      where: { id: orderId, tenantId },
      select: { stickerPublicToken: true },
    });
    const existing = row?.stickerPublicToken?.trim();
    if (existing) return existing;

    const token = newStickerToken();
    const res = await db.order.updateMany({
      where: { id: orderId, tenantId, stickerPublicToken: null },
      data: { stickerPublicToken: token },
    });
    if (res.count === 1) return token;
  }
  throw new Error("ensureStickerPublicTokenForOrder: failed to assign token");
}

export async function ensureStickerPublicTokensForOrders(
  db: PrismaClient,
  tenantId: string,
  orderIds: string[],
): Promise<void> {
  const ids = [...new Set(orderIds.map((x) => String(x || "").trim()).filter(Boolean))];
  for (const id of ids) {
    await ensureStickerPublicTokenForOrder(db, tenantId, id);
  }
}
