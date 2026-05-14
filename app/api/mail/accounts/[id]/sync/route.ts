import { NextResponse } from "next/server";
import { mailErrorResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, syncAccountNow } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    const result = await syncAccountNow(r.ctx.db, r.ctx.tenantId, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось синхронизировать почту");
  }
}
