import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  deleteOrderAttachmentFile,
  readOrderAttachmentBytes,
} from "@/lib/order-attachment-storage";
import { removeAttachmentFromKaitenIfAny } from "@/lib/kaiten-sync";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id: orderId, attachmentId } = await ctx.params;
    const row = await (await getOrdersPrisma()).orderAttachment.findFirst({
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
    const buf = await readOrderAttachmentBytes(row);
    const asciiName = row.fileName.replace(/[^\x20-\x7E]/g, "_");
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Length": String(buf.length),
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
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
        invoiceParsedSummaryText: null,
        invoiceParsedTotalRub: null,
        invoiceParsedLines: Prisma.DbNull,
      },
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
