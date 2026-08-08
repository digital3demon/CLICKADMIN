import { NextResponse } from "next/server";
import { readOrderAttachmentBytes } from "@/lib/order-attachment-storage";
import {
  isPublicStickerHubImageMime,
  isPublicStickerHubScannerScope,
} from "@/lib/sticker-public-attachment-path";
import { resolveStickerOrderBySlugAndToken } from "@/lib/sticker-public-order-resolve";

type Ctx = {
  params: Promise<{
    tenantSlug: string;
    token: string;
    attachmentId: string;
  }>;
};

/**
 * Фото книжного сканера для публичной витрины QR-этикетки.
 * Auth = slug + stickerPublicToken; только SCANNER + image/*.
 */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tenantSlug, token, attachmentId } = await ctx.params;
    const id = String(attachmentId || "").trim();
    if (!id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const resolved = await resolveStickerOrderBySlugAndToken(tenantSlug, token);
    if (!resolved.ok) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const row = await resolved.ordersDb.orderAttachment.findFirst({
      where: {
        id,
        orderId: resolved.orderId,
        scope: "SCANNER",
      },
      select: {
        fileName: true,
        mimeType: true,
        scope: true,
        data: true,
        diskRelPath: true,
      },
    });
    if (
      !row ||
      !isPublicStickerHubScannerScope(row.scope) ||
      !isPublicStickerHubImageMime(row.mimeType)
    ) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const buf = await readOrderAttachmentBytes(row);
    const asciiName = row.fileName.replace(/[^\x20-\x7E]/g, "_");
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": row.mimeType || "image/jpeg",
        "Content-Length": String(buf.length),
        "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("[public sticker attachment]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
