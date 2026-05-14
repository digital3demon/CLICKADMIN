import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, stringField } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    const body = await jsonBody(req);
    const displayName = stringField(body.name, 120);
    if (!displayName) return NextResponse.json({ error: "Укажите название папки" }, { status: 400 });
    const updated = await r.ctx.db.emailFolder.updateMany({
      where: { id, tenantId: r.ctx.tenantId, type: "CUSTOM" },
      data: { displayName },
    });
    if (!updated.count) {
      return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });
    }
    const folder = await r.ctx.db.emailFolder.findFirst({
      where: { id, tenantId: r.ctx.tenantId },
    });
    return NextResponse.json({ folder });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось переименовать папку");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    await r.ctx.db.emailFolder.deleteMany({
      where: { id, tenantId: r.ctx.tenantId, type: "CUSTOM" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось удалить папку");
  }
}
