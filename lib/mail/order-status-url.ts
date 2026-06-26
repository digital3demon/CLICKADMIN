import "server-only";
import type { PrismaClient } from "@prisma/client";
import { ensureStickerPublicTokenForOrder } from "@/lib/order-sticker-token";
import { getSiteOrigin } from "@/lib/site-origin-server";
import { stickerPublicHubAbsoluteUrl } from "@/lib/sticker-public-path";

/** Абсолютный URL публичной витрины статуса заказа (как QR на этикетке). */
export async function resolveOrderStatusUrl(
  db: PrismaClient,
  tenantId: string,
  orderId: string,
  tenantSlug: string,
): Promise<string> {
  const token = await ensureStickerPublicTokenForOrder(db, tenantId, orderId);
  const origin = (await getSiteOrigin())?.replace(/\/+$/, "") ?? "";
  const slug = tenantSlug.trim() || "lab";
  return stickerPublicHubAbsoluteUrl(origin || "https://crm.example", slug, token);
}
