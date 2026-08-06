import "server-only";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseScannerQrPayload,
  type ScannerOrderResolve,
} from "@/lib/scanner-qr-parse";
import { resolveStickerOrderBySlugAndToken } from "@/lib/sticker-public-order-resolve";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";

export { parseScannerQrPayload } from "@/lib/scanner-qr-parse";
export type {
  ParsedScannerQr,
  ScannerOrderResolve,
  ScannerOrderResolveFail,
  ScannerOrderResolveOk,
} from "@/lib/scanner-qr-parse";

/**
 * По тексту QR и tenantId API-ключа находит наряд.
 * Hub: slug из QR должен совпасть с tenant API-ключа.
 * Legacy Kaiten: карточка только внутри того же tenant.
 */
export async function resolveOrderFromScannerQr(
  qrText: string,
  apiKeyTenantId: string,
): Promise<ScannerOrderResolve> {
  const tenantId = String(apiKeyTenantId || "").trim();
  if (!tenantId) {
    return { ok: false, reason: "order_not_found" };
  }

  const parsed = parseScannerQrPayload(qrText);
  if (parsed.kind === "unknown") {
    return { ok: false, reason: "unknown_qr" };
  }

  if (parsed.kind === "hub") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true },
    });
    if (!tenant?.slug || tenant.slug !== parsed.tenantSlug) {
      return { ok: false, reason: "tenant_mismatch" };
    }
    const resolved = await resolveStickerOrderBySlugAndToken(
      parsed.tenantSlug,
      parsed.token,
    );
    if (!resolved.ok || resolved.tenantId !== tenantId) {
      return { ok: false, reason: "order_not_found" };
    }
    const order = await resolved.ordersDb.order.findFirst({
      where: { id: resolved.orderId, tenantId },
      select: { id: true, orderNumber: true },
    });
    if (!order) return { ok: false, reason: "order_not_found" };
    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      tenantId,
      qrKind: "hub",
    };
  }

  // kaiten
  const ordersDb: PrismaClient = await resolveTenantPrismaClient(tenantId);
  const order = await ordersDb.order.findFirst({
    where: { tenantId, kaitenCardId: parsed.cardId },
    select: { id: true, orderNumber: true },
  });
  if (!order) return { ok: false, reason: "order_not_found" };
  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    tenantId,
    qrKind: "kaiten",
  };
}
