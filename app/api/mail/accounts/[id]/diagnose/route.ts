import { NextResponse } from "next/server";
import { mailErrorResponse, mailJsonResponse } from "@/app/api/mail/_utils";
import { diagnoseEmailAccount, getMailApiContext } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    const result = await diagnoseEmailAccount(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      r.ctx.role,
      id,
    );
    return mailJsonResponse(result);
  } catch (err) {
    return mailErrorResponse(err, "Не удалось выполнить диагностику почтового ящика");
  }
}
