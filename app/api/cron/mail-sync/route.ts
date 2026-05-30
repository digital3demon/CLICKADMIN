import { NextResponse } from "next/server";
import { EmailSyncMode } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { enqueueAndStartMailSyncJob } from "@/lib/mail/mail-queue";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

const MAIL_SYNC_DEFAULT_LIMIT = 50;
const MAIL_SYNC_MAX_LIMIT = 100;
const MAIL_SYNC_DEFAULT_CONCURRENCY = 1;
const MAIL_SYNC_MAX_CONCURRENCY = 4;

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
  const url = new URL(req.url);
  const limit = Math.min(
    MAIL_SYNC_MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get("limit") || MAIL_SYNC_DEFAULT_LIMIT)),
  );
  const concurrency = Math.min(
    MAIL_SYNC_MAX_CONCURRENCY,
    Math.max(1, Number(url.searchParams.get("concurrency") || MAIL_SYNC_DEFAULT_CONCURRENCY)),
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

  const results: Array<Record<string, unknown>> = [];
  let cursor = 0;
  async function worker() {
    for (;;) {
      const account = accounts[cursor++];
      if (!account) return;
      if (!account.createdByUserId) continue;
      const accountStartedAt = Date.now();
      const lastSyncAt = account.lastSyncAt?.toISOString() ?? null;
      const baseResult = {
        accountId: account.id,
        lastSyncAt,
      };

      try {
        const result = await enqueueAndStartMailSyncJob(
          db,
          account.tenantId,
          account.createdByUserId,
          "OWNER",
          account.id,
          EmailSyncMode.RECENT,
        );
        results.push({
          ...baseResult,
          enqueued: result.enqueued,
          processed: result.processed,
          background: result.background ?? false,
          imported: result.result?.imported ?? result.syncJob.imported,
          skipped: result.result?.skipped ?? result.syncJob.skipped,
          folders: result.result?.folders ?? result.syncJob.folders,
          folderStats: result.result?.folderStats ?? null,
          status: result.syncJob.status,
          lastError: result.syncJob.lastError,
          elapsedMs: Date.now() - accountStartedAt,
        });
      } catch (err) {
        logger.error({ err, accountId: account.id }, "background mail sync failed");
        results.push({
          ...baseResult,
          processed: false,
          error: err instanceof Error ? err.message : "mail sync failed",
          elapsedMs: Date.now() - accountStartedAt,
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, accounts.length) }, () => worker()));

  const totalImported = results.reduce((sum, row) => sum + Number(row.imported ?? 0), 0);
  const totalSkipped = results.reduce((sum, row) => sum + Number(row.skipped ?? 0), 0);
  const totalErrors = results.filter((row) => row.error || row.status === "FAILED").length;
  const folderStats = results.flatMap((row) => {
    const stats = row.folderStats;
    return Array.isArray(stats) ? stats : [];
  });

  logger.info(
    {
      accountCount: accounts.length,
      processed: results.filter((row) => row.processed).length,
      totalImported,
      totalSkipped,
      totalErrors,
      folderStats,
      elapsedMs: Date.now() - startedAt,
    },
    "mail cron sync completed",
  );

  return NextResponse.json({
    ok: true,
    accountCount: accounts.length,
    limit,
    concurrency,
    elapsedMs: Date.now() - startedAt,
    results,
  });
}
