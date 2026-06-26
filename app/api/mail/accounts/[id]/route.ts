import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import {
  deleteEmailAccount,
  getMailApiContext,
  updateEmailAccountAccessRoles,
} from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    await deleteEmailAccount(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось удалить почтовый аккаунт");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    const body = await jsonBody(req);
    const account = await updateEmailAccountAccessRoles(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.role,
      id,
      body.allowedRoles,
      body.hoverPreviewEnabled,
      body.settingsRoles,
    );
    return NextResponse.json({ account });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось обновить доступ к почтовому аккаунту");
  }
}
