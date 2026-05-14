import { NextResponse } from "next/server";
import { EmailSyncMode } from "@prisma/client";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, stringField } from "@/lib/mail/mail-service";
import { enqueueAndRunMailSyncJob } from "@/lib/mail/mail-queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const body = await jsonBody(req);
    const accountId = stringField(body.accountId, 200);
    const mode = stringField(body.mode, 20) === EmailSyncMode.BACKFILL
      ? EmailSyncMode.BACKFILL
      : EmailSyncMode.RECENT;
    if (accountId) {
      const result = await enqueueAndRunMailSyncJob(r.ctx.db, r.ctx.tenantId, r.ctx.userId, accountId, mode);
      return NextResponse.json({ ok: true, queued: !result.processed, result });
    }
    const accounts = await r.ctx.db.emailAccount.findMany({
      where: { tenantId: r.ctx.tenantId, createdByUserId: r.ctx.userId, isActive: true },
    });
    const results = [];
    for (const account of accounts) {
      results.push({
        accountId: account.id,
        ...(await enqueueAndRunMailSyncJob(r.ctx.db, r.ctx.tenantId, r.ctx.userId, account.id, mode)),
      });
    }
    return NextResponse.json({ ok: true, queued: results.some((item) => !item.processed), results });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось синхронизировать почту");
  }
}
