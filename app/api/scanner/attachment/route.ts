/**
 * DELETE /api/scanner/attachment
 * Body JSON: { orderId, attachmentId }
 * Auth: Bearer TenantApiKey + scope scanner.ingest
 */
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { deleteOrderAttachmentFile } from "@/lib/order-attachment-storage";
import { removeAttachmentFromKaitenIfAny } from "@/lib/kaiten-sync";
import { rateLimitAllow } from "@/lib/server/rate-limit-edge";
import {
  bearerTokenFromAuthorizationHeader,
  resolveTenantApiKey,
  safeScopeIncludes,
  TENANT_API_KEY_SCOPE_SCANNER_INGEST,
} from "@/lib/tenant-api-keys";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function DELETE(req: Request) {
  try {
    const plain = bearerTokenFromAuthorizationHeader(
      req.headers.get("authorization"),
    );
    const apiKey = await resolveTenantApiKey(plain);
    if (!apiKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (
      !safeScopeIncludes(apiKey.scopes, TENANT_API_KEY_SCOPE_SCANNER_INGEST)
    ) {
      return NextResponse.json({ error: "forbidden_scope" }, { status: 403 });
    }
    const ip = clientIp(req);
    if (!rateLimitAllow(`scanner-del:key:${apiKey.keyId}`, 60)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (!rateLimitAllow(`scanner-del:ip:${ip}`, 120)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    let body: { orderId?: unknown; attachmentId?: unknown } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      body = {};
    }
    const orderId = String(body.orderId ?? "").trim();
    const attachmentId = String(body.attachmentId ?? "").trim();
    if (!orderId || !attachmentId) {
      return NextResponse.json(
        { error: "bad_request", detail: "нужны orderId и attachmentId" },
        { status: 400 },
      );
    }

    const prisma = await resolveTenantPrismaClient(apiKey.tenantId);
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: apiKey.tenantId },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }
    const row = await prisma.orderAttachment.findFirst({
      where: { id: attachmentId, orderId },
      select: {
        id: true,
        orderId: true,
        fileName: true,
        uploadedToKaitenAt: true,
        kaitenFileId: true,
        diskRelPath: true,
      },
    });
    if (!row) {
      return NextResponse.json({ error: "attachment_not_found" }, { status: 404 });
    }

    try {
      await removeAttachmentFromKaitenIfAny({
        orderId: row.orderId,
        fileName: row.fileName,
        uploadedToKaitenAt: row.uploadedToKaitenAt,
        kaitenFileId: row.kaitenFileId,
      });
    } catch (e) {
      console.error("[scanner/attachment DELETE] Kaiten", e);
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "Не удалось удалить файл в Kaiten",
        },
        { status: 502 },
      );
    }

    const diskRelPath = row.diskRelPath;
    await prisma.order.updateMany({
      where: { id: orderId, invoiceAttachmentId: attachmentId },
      data: {
        invoiceAttachmentId: null,
        invoiceIssued: false,
        invoiceParsedSummaryText: null,
        invoiceParsedTotalRub: null,
        invoiceParsedLines: Prisma.DbNull,
      },
    });
    await prisma.orderAttachment.delete({ where: { id: attachmentId } });
    await deleteOrderAttachmentFile(diskRelPath);

    console.info("[scanner/attachment DELETE]", {
      keyId: apiKey.keyId,
      orderId,
      attachmentId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[scanner/attachment DELETE]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
