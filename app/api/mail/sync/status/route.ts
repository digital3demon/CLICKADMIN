import { NextResponse } from "next/server";
import { getMailApiContext } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId")?.trim();
  const jobs = await r.ctx.db.emailSyncJob.findMany({
    where: {
      tenantId: r.ctx.tenantId,
      createdByUserId: r.ctx.userId,
      ...(accountId ? { accountId } : {}),
    },
    orderBy: [{ queuedAt: "desc" }],
    take: 10,
  });
  return NextResponse.json({ jobs });
}
