import { NextResponse } from "next/server";
import { getMailApiContext } from "@/lib/mail-api-context";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "_") || "attachment";
}

export async function GET(_req: Request, ctx: Ctx) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId } = r.ctx;
  const { id, attachmentId } = await ctx.params;
  const row = await db.mailAttachment.findFirst({
    where: { id: attachmentId, messageId: id, tenantId },
  });
  if (!row) return NextResponse.json({ error: "Вложение не найдено" }, { status: 404 });
  return new NextResponse(row.data, {
    headers: {
      "Content-Type": row.mimeType || "application/octet-stream",
      "Content-Length": String(row.size),
      "Content-Disposition": `attachment; filename="${asciiFileName(row.fileName)}"; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
