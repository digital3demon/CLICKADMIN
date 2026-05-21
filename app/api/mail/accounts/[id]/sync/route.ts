import { NextResponse } from "next/server";
import { EmailSyncMode } from "@prisma/client";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, stringField } from "@/lib/mail/mail-service";
import { enqueueAndRunMailSyncJob } from "@/lib/mail/mail-queue";
import { applyOrderDigitaldemonRulesToExistingEmails } from "@/lib/mail/order-digitaldemon-apply";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    const body = await jsonBody(req);
    const mode = stringField(body.mode, 20) === EmailSyncMode.BACKFILL
      ? EmailSyncMode.BACKFILL
      : EmailSyncMode.RECENT;
    const result = await enqueueAndRunMailSyncJob(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, id, mode);
    const rulesApply = await applyOrderDigitaldemonRulesToExistingEmails(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      r.ctx.role,
      id,
    );
    return NextResponse.json({
      ok: true,
      status: result.syncJob.status,
      lastError: result.syncJob.lastError,
      queued: !result.processed,
      enqueued: result.enqueued,
      processed: result.processed,
      result: result.result,
      rulesApply,
      syncJob: result.syncJob,
    });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось синхронизировать почту");
  }
}
