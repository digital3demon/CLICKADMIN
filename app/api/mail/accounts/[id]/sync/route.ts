import { NextResponse } from "next/server";
import { EmailSyncMode } from "@prisma/client";
import { jsonBody, mailErrorResponse, mailJsonResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, stringField } from "@/lib/mail/mail-service";
import { enqueueAndStartMailSyncJob } from "@/lib/mail/mail-queue";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  if (r.ctx.isDemo) {
    return mailJsonResponse({
      ok: true,
      demo: true,
      queued: false,
      status: "DONE",
      lastError: null,
      message: "В демо синхронизация с почтовым сервером отключена",
    });
  }
  try {
    const { id } = await params;
    const body = await jsonBody(req);
    const mode = stringField(body.mode, 20) === EmailSyncMode.BACKFILL
      ? EmailSyncMode.BACKFILL
      : EmailSyncMode.RECENT;
    const force = body.force === true || body.force === "true" || body.force === 1 || body.force === "1";
    const scope =
      stringField(body.scope, 20) === "all" || force
        ? "all"
        : "priority";
    const result = await enqueueAndStartMailSyncJob(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      r.ctx.role,
      id,
      mode,
      { force, scope },
    );
    return mailJsonResponse({
      ok: true,
      background: result.background ?? false,
      status: result.syncJob.status,
      lastError: result.syncJob.lastError,
      queued: !result.processed,
      enqueued: result.enqueued,
      processed: result.processed,
      result: result.result,
      syncJob: result.syncJob,
    });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось синхронизировать почту");
  }
}
