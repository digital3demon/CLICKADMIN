import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, assertMailSettingsManage, mailSettingsAccountAccessWhere, stringField } from "@/lib/mail/mail-service";

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
    const label = await r.ctx.db.emailLabel.findFirst({
      where: {
        id,
        tenantId: r.ctx.tenantId,
        account: mailSettingsAccountAccessWhere(r.ctx.tenantId, r.ctx.userId, r.ctx.role),
      },
      select: { id: true, accountId: true },
    });
    if (!label) return NextResponse.json({ error: "Метка не найдена" }, { status: 404 });
    await assertMailSettingsManage(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      r.ctx.role,
      label.accountId,
    );
    const updated = await r.ctx.db.emailLabel.updateMany({
      where: { id: label.id, tenantId: r.ctx.tenantId },
      data: {
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
      },
    });
    if (!updated.count) return NextResponse.json({ error: "Метка не найдена" }, { status: 404 });
    const saved = await r.ctx.db.emailLabel.findFirst({
      where: { id: label.id, tenantId: r.ctx.tenantId },
    });
    return NextResponse.json({ label: saved });
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
    const label = await r.ctx.db.emailLabel.findFirst({
      where: {
        id,
        tenantId: r.ctx.tenantId,
        account: mailSettingsAccountAccessWhere(r.ctx.tenantId, r.ctx.userId, r.ctx.role),
      },
      select: { id: true, accountId: true },
    });
    if (!label) return NextResponse.json({ error: "Метка не найдена" }, { status: 404 });
    await assertMailSettingsManage(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      r.ctx.role,
      label.accountId,
    );
    await r.ctx.db.emailLabel.deleteMany({
      where: { id: label.id, tenantId: r.ctx.tenantId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось удалить метку");
  }
}
