import "server-only";
import type { Prisma } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { runOrderEmailPrediction } from "./run-order-email-prediction";
import { logger } from "@/lib/server/logger";

/** Один наряд за раз на tenant — следующий стартует только после завершения предыдущего. */
const tenantQueues = new Map<string, Promise<void>>();

async function isAiConfigured(tenantId: string): Promise<boolean> {
  const db = await getOrdersPrisma();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { aiEnabled: true, openRouterApiKey: true },
  });
  return Boolean(tenant?.aiEnabled && tenant?.openRouterApiKey);
}

async function savePredictionRun(
  tenantId: string,
  orderId: string,
  emailId: string,
  run: Awaited<ReturnType<typeof runOrderEmailPrediction>>,
  mode: "create" | { updateId: string },
) {
  if (!run) return;

  const db = await getOrdersPrisma();
  const data = {
    model: run.model,
    durationMs: run.durationMs,
    predictionJson: run.predictionJson as Prisma.InputJsonValue,
    error: run.error,
  };

  if (mode === "create") {
    await db.aiOrderPrediction.create({
      data: { tenantId, orderId, emailId, ...data },
    });
  } else {
    await db.aiOrderPrediction.update({
      where: { id: mode.updateId },
      data,
    });
  }

  logger.info(
    { orderId, emailId, model: run.model, durationMs: run.durationMs, ok: !run.error },
    mode === "create" ? "AI shadow prediction completed" : "AI prediction retry completed",
  );
}

function enqueueSerialPredictionJob(tenantId: string, job: () => Promise<void>): void {
  const previous = tenantQueues.get(tenantId) ?? Promise.resolve();
  const next = previous
    .then(job)
    .catch((err) => {
      logger.error({ err, tenantId }, "AI prediction queue job failed");
    });
  tenantQueues.set(tenantId, next);
}

async function runPredictionJob(
  tenantId: string,
  orderId: string,
  emailId: string,
  mode: "create" | { updateId: string },
) {
  if (!(await isAiConfigured(tenantId))) return;

  const db = await getOrdersPrisma();
  const run = await runOrderEmailPrediction(db, tenantId, emailId, orderId);
  await savePredictionRun(tenantId, orderId, emailId, run, mode);
}

export function runShadowPredictionInBackground(
  tenantId: string,
  orderId: string,
  emailId: string,
) {
  enqueueSerialPredictionJob(tenantId, async () => {
    try {
      await runPredictionJob(tenantId, orderId, emailId, "create");
    } catch (e: any) {
      logger.error({ err: e, orderId, emailId }, "AI shadow prediction failed");
    }
  });
}

export function rerunAiPredictionInBackground(
  tenantId: string,
  predictionId: string,
  orderId: string,
  emailId: string,
) {
  enqueueSerialPredictionJob(tenantId, async () => {
    try {
      await runPredictionJob(tenantId, orderId, emailId, { updateId: predictionId });
    } catch (e: any) {
      logger.error({ err: e, orderId, emailId, predictionId }, "AI prediction retry failed");
    }
  });
}

/** Пересчитать все предсказания с ошибкой (например, после смены модели). */
export async function queueFailedAiPredictionsRetry(tenantId: string): Promise<number> {
  const db = await getOrdersPrisma();
  const failed = await db.aiOrderPrediction.findMany({
    where: {
      tenantId,
      error: { not: null },
    },
    select: { id: true, orderId: true, emailId: true },
    orderBy: { createdAt: "asc" },
  });

  for (const row of failed) {
    rerunAiPredictionInBackground(tenantId, row.id, row.orderId, row.emailId);
  }

  return failed.length;
}
