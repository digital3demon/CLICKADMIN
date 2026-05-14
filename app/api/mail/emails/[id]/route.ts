import { NextResponse } from "next/server";
import { mailErrorResponse } from "@/app/api/mail/_utils";
import { getEmailDetail, getMailApiContext } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const markRead = url.searchParams.get("markRead") !== "0";
    const email = await getEmailDetail(r.ctx.db, r.ctx.tenantId, r.ctx.userId, id, markRead);
    return NextResponse.json({ email });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось открыть письмо");
  }
}
