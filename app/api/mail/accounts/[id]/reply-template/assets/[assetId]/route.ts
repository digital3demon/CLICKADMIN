import { NextResponse } from "next/server";
import { mailErrorResponse } from "@/app/api/mail/_utils";
import {
  deleteEmailReplyTemplateAsset,
  getEmailReplyTemplateAssetBytes,
  getMailApiContext,
} from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id, assetId } = await params;
    const { mimeType, fileName, data } = await getEmailReplyTemplateAssetBytes(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      r.ctx.role,
      id,
      assetId,
    );
    const inline = new URL(req.url).searchParams.get("inline") === "1";
    const headers = new Headers({
      "Content-Type": mimeType,
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=3600",
    });
    if (!inline) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
    }
    return new NextResponse(new Uint8Array(data), { status: 200, headers });
  } catch (err) {
    return mailErrorResponse(err, "Файл не найден");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id, assetId } = await params;
    await deleteEmailReplyTemplateAsset(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.role,
      id,
      assetId,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось удалить файл");
  }
}
