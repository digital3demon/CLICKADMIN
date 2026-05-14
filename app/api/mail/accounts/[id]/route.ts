import { NextResponse } from "next/server";
import { mailErrorResponse } from "@/app/api/mail/_utils";
import { deleteEmailAccount, getMailApiContext } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    await deleteEmailAccount(r.ctx.db, r.ctx.tenantId, r.ctx.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось удалить почтовый аккаунт");
  }
}
