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
    const name = stringField(body.name, 80);
    const color = stringField(body.color, 20);
    const updated = await r.ctx.db.emailLabel.updateMany({
      where: { id, tenantId: r.ctx.tenantId },
      data: {
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
      },
    });
    if (!updated.count) return NextResponse.json({ error: "Метка не найдена" }, { status: 404 });
    const label = await r.ctx.db.emailLabel.findFirst({ where: { id, tenantId: r.ctx.tenantId } });
    return NextResponse.json({ label });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось обновить метку");
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
    await r.ctx.db.emailLabel.deleteMany({ where: { id, tenantId: r.ctx.tenantId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось удалить метку");
  }
}
