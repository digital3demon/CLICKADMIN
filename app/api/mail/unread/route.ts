import { NextResponse } from "next/server";
import { getMailApiContext, mailUnreadSummary } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const summary = await mailUnreadSummary(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role);
  return NextResponse.json(summary);
}
