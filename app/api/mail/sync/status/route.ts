import { NextResponse } from "next/server";
import { mailJsonResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, mailAccountAccessWhere } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId")?.trim();
  const accessibleAccount = accountId
    ? await r.ctx.db.emailAccount.findFirst({
        where: {
          id: accountId,
          ...mailAccountAccessWhere(r.ctx.tenantId, r.ctx.userId, r.ctx.role),
        },
        select: { id: true },
      })
    : null;
  if (accountId && !accessibleAccount) {
    return NextResponse.json({ jobs: [] });
  }
  const jobs = await r.ctx.db.emailSyncJob.findMany({
    where: {
      tenantId: r.ctx.tenantId,
      ...(accountId ? { accountId } : {}),
      account: mailAccountAccessWhere(r.ctx.tenantId, r.ctx.userId, r.ctx.role),
    },
    orderBy: [{ queuedAt: "desc" }],
    take: 10,
    select: {
      id: true,
      status: true,
      imported: true,
      skipped: true,
      lastError: true,
      startedAt: true,
      finishedAt: true,
      queuedAt: true,
      accountId: true,
    },
  });
  return mailJsonResponse({ jobs });
}
