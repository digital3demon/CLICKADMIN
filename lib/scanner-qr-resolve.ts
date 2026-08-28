import "server-only";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseScannerQrPayload,
  type ScannerOrderResolve,
  type ScannerOrderResolveOk,
} from "@/lib/scanner-qr-parse";
import {
  orderNumberOcrConfusionVariants,
  pickOrderNumberAfterOcrConfusion,
} from "@/lib/scanner-ocr-order-parse";
import { resolveStickerOrderBySlugAndToken } from "@/lib/sticker-public-order-resolve";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";

export { parseScannerQrPayload } from "@/lib/scanner-qr-parse";
export type {
  ParsedScannerQr,
  ScannerOrderResolve,
  ScannerOrderResolveFail,
  ScannerOrderResolveOk,
} from "@/lib/scanner-qr-parse";

const ORDER_SCAN_SELECT = {
  id: true,
  orderNumber: true,
  patientName: true,
  doctor: { select: { fullName: true } },
  clinic: { select: { name: true } },
} as const;

type OrderScanRow = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctor: { fullName: string } | null;
  clinic: { name: string } | null;
};

function toResolveOk(
  order: OrderScanRow,
  tenantId: string,
  qrKind: ScannerOrderResolveOk["qrKind"],
): ScannerOrderResolveOk {
  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    patientName: order.patientName?.trim() || null,
    doctorName: order.doctor?.fullName?.trim() || null,
    tenantId,
    qrKind,
  };
}

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
      select: ORDER_SCAN_SELECT,
    });
    if (!order) return { ok: false, reason: "order_not_found" };
    return toResolveOk(order, tenantId, "hub");
  }

  // kaiten
  const ordersDb: PrismaClient = await resolveTenantPrismaClient(tenantId);
  const order = await ordersDb.order.findFirst({
    where: { tenantId, kaitenCardId: parsed.cardId },
    select: ORDER_SCAN_SELECT,
  });
  if (!order) return { ok: false, reason: "order_not_found" };
  return toResolveOk(order, tenantId, "kaiten");
}

/** Поиск наряда по номеру YYMM-NNN (OCR печатного наряда без QR). */
export async function resolveOrderFromOrderNumber(
  orderNumberRaw: string,
  apiKeyTenantId: string,
  ocrText = "",
  opts?: { exactOnly?: boolean },
): Promise<ScannerOrderResolve> {
  const tenantId = String(apiKeyTenantId || "").trim();
  const compact = String(orderNumberRaw || "")
    .trim()
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, "");
  const glued = /^(\d{4})(\d{3})$/.exec(compact);
  const orderNumber = glued
    ? `${glued[1]}-${glued[2]}`
    : compact;
  if (!tenantId || !orderNumber) {
    return { ok: false, reason: "order_not_found" };
  }
  const ordersDb: PrismaClient = await resolveTenantPrismaClient(tenantId);
  const variants = opts?.exactOnly
    ? [orderNumber]
    : [orderNumber, ...orderNumberOcrConfusionVariants(orderNumber)];
  const rows = await ordersDb.order.findMany({
    where: { tenantId, orderNumber: { in: variants } },
    select: ORDER_SCAN_SELECT,
  });
  const picked = pickOrderNumberAfterOcrConfusion(
    orderNumber,
    rows.map((r) => ({
      orderNumber: r.orderNumber,
      patientName: r.patientName,
      doctorName: r.doctor?.fullName ?? null,
      clinicName: r.clinic?.name ?? null,
      row: r,
    })),
    ocrText,
  );
  if (!picked) {
    if (rows.length > 1) {
      return {
        ok: false,
        reason: "ambiguous_order_number",
        candidates: rows.map((r) => r.orderNumber).sort(),
      };
    }
    return { ok: false, reason: "order_not_found" };
  }
  const order = picked.row;
  if (order.orderNumber !== orderNumber) {
    console.info("[scanner] ocr digit-confusion", {
      requested: orderNumber,
      picked: order.orderNumber,
    });
  }
  return toResolveOk(order, tenantId, "ocr");
}
