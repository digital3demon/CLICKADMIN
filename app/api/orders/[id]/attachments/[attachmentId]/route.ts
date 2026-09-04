import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import {
  deleteOrderAttachmentFile,
  readOrderAttachmentBytes,
} from "@/lib/order-attachment-storage";
import { removeAttachmentFromKaitenIfAny } from "@/lib/kaiten-sync";
import { isOrderAttachmentThumbRequest } from "@/lib/order-attachment-thumb";
import { buildOrderAttachmentThumbJpeg } from "@/lib/order-attachment-thumb.server";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id: orderId, attachmentId } = await ctx.params;
    const prisma = await getOrdersPrisma();
    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const row = await prisma.orderAttachment.findFirst({
      where: { id: attachmentId, orderId },
      select: {
        fileName: true,
        mimeType: true,
        data: true,
        diskRelPath: true,
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }
    const buf = await readOrderAttachmentBytes(row);
    const asciiName = row.fileName.replace(/[^\x20-\x7E]/g, "_");
    const url = new URL(req.url);
    const inline = url.searchParams.get("inline") === "1";
    const wantThumb = isOrderAttachmentThumbRequest(url.searchParams);
    const mime = (row.mimeType || "").toLowerCase();
    const looksImage =
      mime.startsWith("image/") ||
      /\.(jpe?g|png|gif|webp|bmp)$/i.test(row.fileName);

    if (wantThumb && looksImage) {
      const t0 = Date.now();
      const thumb = await buildOrderAttachmentThumbJpeg(Buffer.from(buf));
      if (thumb) {
        console.info(
          JSON.stringify({
            evt: "order_attachment_thumb",
            orderId,
            attachmentId,
            srcBytes: buf.length,
            thumbBytes: thumb.length,
            ms: Date.now() - t0,
          }),
        );
        return new Response(new Uint8Array(thumb), {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": String(thumb.length),
            "Content-Disposition": `inline; filename="${asciiName.replace(/\.[^.]+$/, "") || "preview"}.jpg"`,
            "Cache-Control": "private, max-age=86400",
          },
        });
      }
    }

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Length": String(buf.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
        ...(wantThumb ? { "Cache-Control": "private, max-age=300" } : {}),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось отдать файл" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id: orderId, attachmentId } = await ctx.params;
    const prisma = await getOrdersPrisma();
    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
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
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }

    try {
      await removeAttachmentFromKaitenIfAny({
        orderId: row.orderId,
        fileName: row.fileName,
        uploadedToKaitenAt: row.uploadedToKaitenAt,
        kaitenFileId: row.kaitenFileId,
      });
    } catch (e) {
      console.error("[attachments DELETE] Kaiten", e);
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "Не удалось удалить файл в Kaiten; запись в CRM не тронута",
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
        invoiceIssuedAt: null,
        invoiceParsedSummaryText: null,
        invoiceParsedTotalRub: null,
        invoiceParsedLines: Prisma.DbNull,
      },
    });
    await prisma.order.updateMany({
      where: { id: orderId, updAttachmentId: attachmentId },
      data: { updAttachmentId: null },
    });
    await prisma.orderAttachment.delete({ where: { id: attachmentId } });
    await deleteOrderAttachmentFile(diskRelPath);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось удалить файл" },
      { status: 500 },
    );
  }
}
