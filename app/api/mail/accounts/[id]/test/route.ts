import { NextResponse } from "next/server";
import { mailErrorResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, testEmailAccountConnection } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    await testEmailAccountConnection(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось подключиться к Яндекс.Почте");
  }
}
