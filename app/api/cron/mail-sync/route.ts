import { NextResponse } from "next/server";
import { EmailSyncMode } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { enqueueAndRunMailSyncJob } from "@/lib/mail/mail-queue";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization")?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const internalSecret = process.env.INTERNAL_MAIL_SYNC_SECRET?.trim();
  const internalHeader = req.headers.get("x-internal-mail-sync-secret")?.trim();
  return Boolean(internalSecret && internalHeader === internalSecret);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startedAt = Date.now();
  const db = await getOrdersPrisma();
  const limit = Math.min(
    50,
    Math.max(1, Number(new URL(req.url).searchParams.get("limit") || 20)),
  );
  const accounts = await db.emailAccount.findMany({
    where: {
      isActive: true,
      createdByUserId: { not: null },
      encryptedAppPassword: { not: null },
    },
    orderBy: [{ lastSyncAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const results = [];
  for (const account of accounts) {
    if (!account.createdByUserId) continue;
    try {
      const result = await enqueueAndRunMailSyncJob(
        db,
        account.tenantId,
        account.createdByUserId,
        "OWNER",
        account.id,
        EmailSyncMode.RECENT,
      );
      results.push({
        accountId: account.id,
        processed: result.processed,
        imported: result.result?.imported ?? result.syncJob.imported,
        skipped: result.result?.skipped ?? result.syncJob.skipped,
        status: result.syncJob.status,
      });
    } catch (err) {
      logger.error({ err, accountId: account.id }, "background mail sync failed");
      results.push({
        accountId: account.id,
        processed: false,
        error: err instanceof Error ? err.message : "mail sync failed",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    accountCount: accounts.length,
    elapsedMs: Date.now() - startedAt,
    results,
  });
}
