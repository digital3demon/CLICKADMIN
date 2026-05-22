import "server-only";

import { EmailSyncJobStatus, EmailSyncMode, type PrismaClient } from "@prisma/client";
import { syncAccountNow } from "@/lib/mail/mail-service";
import { logger } from "@/lib/server/logger";

const STALE_RUNNING_JOB_MS = 2 * 60 * 1000;

function mailSyncErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Синхронизация почты завершилась ошибкой";
  const details = err as Error & {
    code?: unknown;
    responseText?: unknown;
    executedCommand?: unknown;
  };
  const code = typeof details.code === "string" ? details.code : "";
  if (code === "ETIMEOUT" || code === "ETIMEDOUT" || err.message.toLowerCase().includes("socket timeout")) {
    return "Почтовый сервер не ответил вовремя. Синхронизация повторится автоматически.";
  }
  if (err.message === "Command failed" && typeof details.responseText === "string" && details.responseText.trim()) {
    return `IMAP-команда отклонена сервером: ${details.responseText.trim()}`;
  }
  if (err.message === "Command failed" && typeof details.executedCommand === "string") {
    return `IMAP-команда отклонена сервером: ${details.executedCommand.slice(0, 120)}`;
  }
  return err.message || "Синхронизация почты завершилась ошибкой";
}

export async function enqueueMailSyncJob(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  accountId: string,
  mode: EmailSyncMode = EmailSyncMode.RECENT,
) {
  const existing = await db.emailSyncJob.findFirst({
    where: {
      tenantId,
      accountId,
      createdByUserId: userId,
      mode,
      status: { in: [EmailSyncJobStatus.QUEUED, EmailSyncJobStatus.RUNNING] },
    },
    orderBy: { queuedAt: "desc" },
  });
  if (existing) return { syncJob: existing, enqueued: false };

  const syncJob = await db.emailSyncJob.create({
    data: {
      tenantId,
      accountId,
      createdByUserId: userId,
      mode,
      jobKey: `${tenantId}:${accountId}:${mode}:${Date.now()}`,
      status: EmailSyncJobStatus.QUEUED,
    },
  });

  return { syncJob, enqueued: true };
}

export async function runMailSyncJob(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  syncJobId: string,
) {
  const staleBefore = new Date(Date.now() - STALE_RUNNING_JOB_MS);
  const started = await db.emailSyncJob.updateMany({
    where: {
      id: syncJobId,
      tenantId,
      OR: [
        { status: EmailSyncJobStatus.QUEUED },
        { status: EmailSyncJobStatus.RUNNING, lockedAt: null },
        { status: EmailSyncJobStatus.RUNNING, lockedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: EmailSyncJobStatus.RUNNING,
      attempts: { increment: 1 },
      startedAt: new Date(),
      lockedAt: new Date(),
      lastError: null,
    },
  });
  const syncJob = await db.emailSyncJob.findFirst({
    where: { id: syncJobId, tenantId, createdByUserId: userId },
  });
  if (!syncJob) throw new Error("EMAIL_SYNC_JOB_NOT_FOUND");
  if (!started.count) return { syncJob, processed: false, result: null };

  try {
    const result = await syncAccountNow(db, tenantId, userId, role, syncJob.accountId, {
      mode: syncJob.mode,
    });
    const updated = await db.emailSyncJob.update({
      where: { id: syncJob.id },
      data: {
        status: EmailSyncJobStatus.SUCCEEDED,
        imported: result.imported,
        skipped: result.skipped,
        folders: result.folders,
        stats: result,
        finishedAt: new Date(),
        lockedAt: null,
      },
    });
    return { syncJob: updated, processed: true, result };
  } catch (err) {
    const message = mailSyncErrorMessage(err);
    const failedPermanently = syncJob.attempts + 1 >= syncJob.maxAttempts;
    const updated = await db.emailSyncJob.update({
      where: { id: syncJob.id },
      data: {
        status: failedPermanently ? EmailSyncJobStatus.FAILED : EmailSyncJobStatus.QUEUED,
        lastError: message,
        finishedAt: failedPermanently ? new Date() : null,
        lockedAt: null,
      },
    });
    logger.error({ err, tenantId, accountId: syncJob.accountId, syncJobId }, "mail sync job failed");
    return { syncJob: updated, processed: failedPermanently, result: null };
  }
}

export async function enqueueAndRunMailSyncJob(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  mode: EmailSyncMode = EmailSyncMode.RECENT,
) {
  const queued = await enqueueMailSyncJob(db, tenantId, userId, accountId, mode);
  const processed = await runMailSyncJob(db, tenantId, userId, role, queued.syncJob.id);
  return { ...queued, ...processed };
}
