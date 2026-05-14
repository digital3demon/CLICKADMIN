import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import {
  deleteEmailRule,
  getMailApiContext,
  stringField,
  updateEmailRule,
} from "@/lib/mail/mail-service";

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
    const rule = await updateEmailRule(r.ctx.db, r.ctx.tenantId, r.ctx.userId, id, {
      name: typeof body.name === "string" ? stringField(body.name, 160) : null,
      isActive: typeof body.isActive === "boolean" ? body.isActive : null,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : null,
      conditions: body.conditions,
      actions: body.actions,
    });
    return NextResponse.json({ rule });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось обновить правило почты");
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
    await deleteEmailRule(r.ctx.db, r.ctx.tenantId, r.ctx.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось удалить правило почты");
  }
}
