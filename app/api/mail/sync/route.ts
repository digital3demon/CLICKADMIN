import { NextResponse } from "next/server";
import { EmailSyncMode } from "@prisma/client";
import { jsonBody, mailErrorResponse, mailJsonResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, listEmailAccounts, stringField } from "@/lib/mail/mail-service";
import { enqueueAndStartMailSyncJob } from "@/lib/mail/mail-queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  if (r.ctx.isDemo) {
    return mailJsonResponse({
      ok: true,
      demo: true,
      queued: false,
      message: "В демо синхронизация с почтовым сервером отключена",
    });
  }
  try {
    const body = await jsonBody(req);
    const accountId = stringField(body.accountId, 200);
    const mode = stringField(body.mode, 20) === EmailSyncMode.BACKFILL
      ? EmailSyncMode.BACKFILL
      : EmailSyncMode.RECENT;
    if (accountId) {
      const result = await enqueueAndStartMailSyncJob(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, accountId, mode);
      return mailJsonResponse({ ok: true, background: result.background ?? false, queued: !result.processed, result });
    }
    const accounts = (await listEmailAccounts(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role)).filter(
      (account) => account.isActive,
    );
    const results = [];
    for (const account of accounts) {
      const result = await enqueueAndStartMailSyncJob(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, account.id, mode);
      results.push({
        accountId: account.id,
        ...result,
      });
    }
    return mailJsonResponse({ ok: true, queued: results.some((item) => !item.processed), results });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось синхронизировать почту");
  }
}
