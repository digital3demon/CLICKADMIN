import "server-only";

import { EmailSyncJobStatus, EmailSyncMode, type PrismaClient } from "@prisma/client";
import { sanitizeForMailJson } from "@/app/api/mail/_utils";
import { syncAccountNow } from "@/lib/mail/mail-service";
import { logger } from "@/lib/server/logger";

const STALE_RUNNING_JOB_MS = 90_000;
const MAX_MAIL_SYNC_JOB_MS = 12 * 60 * 1000;

/** Один IMAP-sync на ящик — без параллельных подключений и гонок курсора. */
const activeMailSyncImapWork = new Map<string, Promise<unknown>>();

function mailSyncAccountKey(tenantId: string, accountId: string): string {
  return `${tenantId}:${accountId}`;
}

function mailSyncTimeoutError(): Error {
  return new Error("MAIL_SYNC_TIMEOUT");
}

async function chainNextCustomFolderSyncJob(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  mode: EmailSyncMode,
): Promise<void> {
  const chained = await enqueueMailSyncJob(db, tenantId, userId, accountId, mode);
  if (!chained.enqueued) return;
  void runMailSyncJob(db, tenantId, userId, role, chained.syncJob.id).catch((err) => {
    logger.error({ err, tenantId, accountId, syncJobId: chained.syncJob.id }, "chained mail sync failed");
  });
}

export async function recoverStaleMailSyncJobs(
  db: PrismaClient,
  filter: { tenantId: string; accountId?: string },
): Promise<number> {
  const maxDurationBefore = new Date(Date.now() - MAX_MAIL_SYNC_JOB_MS);
  const updated = await db.emailSyncJob.updateMany({
    where: {
      tenantId: filter.tenantId,
      ...(filter.accountId ? { accountId: filter.accountId } : {}),
      status: EmailSyncJobStatus.RUNNING,
      OR: [
        { startedAt: { lt: maxDurationBefore } },
        { startedAt: null, lockedAt: { lt: maxDurationBefore } },
      ],
    },
    data: {
      status: EmailSyncJobStatus.FAILED,
      lastError:
        "Синхронизация прервана: превышено максимальное время выполнения. Нажмите «Обновить» ещё раз.",
      finishedAt: new Date(),
      lockedAt: null,
    },
  });
  if (updated.count > 0) {
    logger.warn(
      { tenantId: filter.tenantId, accountId: filter.accountId, count: updated.count },
      "mail sync recovered stale RUNNING jobs",
    );
  }
  return updated.count;
}

function mailSyncErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === "MAIL_SYNC_TIMEOUT") {
    return "Синхронизация не успела завершиться вовремя. Повторите — загрузка продолжится с последних папок.";
  }
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
  await recoverStaleMailSyncJobs(db, { tenantId, accountId });
  const existing = await db.emailSyncJob.findFirst({
    where: {
      tenantId,
      accountId,
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
  const maxDurationBefore = new Date(Date.now() - MAX_MAIL_SYNC_JOB_MS);
  const syncJobPreview = await db.emailSyncJob.findFirst({
    where: { id: syncJobId, tenantId },
    select: { id: true, accountId: true },
  });
  if (!syncJobPreview) throw new Error("EMAIL_SYNC_JOB_NOT_FOUND");
  const accountKey = mailSyncAccountKey(tenantId, syncJobPreview.accountId);
  await recoverStaleMailSyncJobs(db, { tenantId, accountId: syncJobPreview.accountId });
  const started = await db.emailSyncJob.updateMany({
    where: {
      id: syncJobId,
      tenantId,
      OR: [
        { status: EmailSyncJobStatus.QUEUED },
        { status: EmailSyncJobStatus.RUNNING, lockedAt: null },
        { status: EmailSyncJobStatus.RUNNING, lockedAt: { lt: staleBefore } },
        { status: EmailSyncJobStatus.RUNNING, startedAt: { lt: maxDurationBefore } },
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
    where: { id: syncJobId, tenantId },
  });
  if (!syncJob) throw new Error("EMAIL_SYNC_JOB_NOT_FOUND");
  if (!started.count) return { syncJob, processed: false, result: null };

  const heartbeatInterval = setInterval(() => {
    void db.emailSyncJob
      .updateMany({
        where: { id: syncJob.id, status: EmailSyncJobStatus.RUNNING },
        data: { lockedAt: new Date() },
      })
      .catch(() => undefined);
  }, 30_000);

  const syncWork = syncAccountNow(db, tenantId, userId, role, syncJob.accountId, {
    mode: syncJob.mode,
  });
  activeMailSyncImapWork.set(accountKey, syncWork);

  try {
    const result = await syncWork;
    const stillRunning = await db.emailSyncJob.findFirst({
      where: { id: syncJob.id, status: EmailSyncJobStatus.RUNNING },
      select: { id: true },
    });
    if (!stillRunning) {
      const current = await db.emailSyncJob.findFirst({ where: { id: syncJob.id, tenantId } });
      return { syncJob: current ?? syncJob, processed: false, result: null };
    }
    const updated = await db.emailSyncJob.update({
      where: { id: syncJob.id },
      data: {
        status: EmailSyncJobStatus.SUCCEEDED,
        imported: result.imported,
        skipped: result.skipped,
        folders: result.folders,
        stats: sanitizeForMailJson(result),
        finishedAt: new Date(),
        lockedAt: null,
      },
    });
    if (
      syncJob.mode === EmailSyncMode.RECENT &&
      result.hasMoreCustomFolders
    ) {
      await chainNextCustomFolderSyncJob(
        db,
        tenantId,
        syncJob.createdByUserId ?? userId,
        role,
        syncJob.accountId,
        syncJob.mode,
      );
    }
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
  } finally {
    clearInterval(heartbeatInterval);
    await syncWork.catch(() => undefined);
    if (activeMailSyncImapWork.get(accountKey) === syncWork) {
      activeMailSyncImapWork.delete(accountKey);
    }
  }
}

export type MailSyncJobRunResult = Awaited<ReturnType<typeof runMailSyncJob>>;

export async function enqueueAndStartMailSyncJob(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  mode: EmailSyncMode = EmailSyncMode.RECENT,
  options: { wait?: boolean } = {},
) {
  const accountKey = mailSyncAccountKey(tenantId, accountId);
  const inFlight = activeMailSyncImapWork.get(accountKey);
  if (inFlight) {
    const activeJob = await db.emailSyncJob.findFirst({
      where: {
        tenantId,
        accountId,
        mode,
        status: { in: [EmailSyncJobStatus.QUEUED, EmailSyncJobStatus.RUNNING] },
      },
      orderBy: { queuedAt: "desc" },
    });
    const latestJob =
      activeJob ??
      (await db.emailSyncJob.findFirst({
        where: { tenantId, accountId, mode },
        orderBy: { queuedAt: "desc" },
      }));
    if (!latestJob) throw new Error("EMAIL_SYNC_JOB_NOT_FOUND");
    if (options.wait) {
      await inFlight.catch(() => undefined);
      const finished = await db.emailSyncJob.findFirst({ where: { id: latestJob.id, tenantId } });
      return {
        syncJob: finished ?? latestJob,
        enqueued: false,
        processed: finished?.status === EmailSyncJobStatus.SUCCEEDED,
        result: null,
        background: false,
      };
    }
    return {
      syncJob: latestJob,
      enqueued: false,
      processed: false,
      result: null,
      background: true,
    };
  }

  const queued = await enqueueMailSyncJob(db, tenantId, userId, accountId, mode);

  const runPromise = runMailSyncJob(db, tenantId, userId, role, queued.syncJob.id);
  if (options.wait) {
    const processed = await runPromise;
    return { ...queued, ...processed, background: false };
  }

  void runPromise.catch((err) => {
    logger.error({ err, tenantId, accountId, syncJobId: queued.syncJob.id }, "background mail sync failed");
  });
  return { ...queued, processed: false, result: null, background: true };
}

/** Cron и ручной режим «дождаться результата». */
export async function enqueueAndRunMailSyncJob(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
  mode: EmailSyncMode = EmailSyncMode.RECENT,
) {
  return enqueueAndStartMailSyncJob(db, tenantId, userId, role, accountId, mode, { wait: true });
}
