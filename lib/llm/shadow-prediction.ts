import "server-only";
import type { Prisma } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { runOrderEmailPrediction } from "./run-order-email-prediction";
import { logger } from "@/lib/server/logger";

const RETRY_DELAY_MS = 3000;

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

export function runShadowPredictionInBackground(
  tenantId: string,
  orderId: string,
  emailId: string,
  delayMs = 0,
) {
  setTimeout(async () => {
    try {
      if (!(await isAiConfigured(tenantId))) return;

      const db = await getOrdersPrisma();
      const run = await runOrderEmailPrediction(db, tenantId, emailId, orderId);
      await savePredictionRun(tenantId, orderId, emailId, run, "create");
    } catch (e: any) {
      logger.error({ err: e, orderId, emailId }, "AI shadow prediction failed");
    }
  }, delayMs);
}

export function rerunAiPredictionInBackground(
  tenantId: string,
  predictionId: string,
  orderId: string,
  emailId: string,
  delayMs = 0,
) {
  setTimeout(async () => {
    try {
      if (!(await isAiConfigured(tenantId))) return;

      const db = await getOrdersPrisma();
      const run = await runOrderEmailPrediction(db, tenantId, emailId, orderId);
      await savePredictionRun(tenantId, orderId, emailId, run, { updateId: predictionId });
    } catch (e: any) {
      logger.error({ err: e, orderId, emailId, predictionId }, "AI prediction retry failed");
    }
  }, delayMs);
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

  failed.forEach((row, index) => {
    rerunAiPredictionInBackground(
      tenantId,
      row.id,
      row.orderId,
      row.emailId,
      index * RETRY_DELAY_MS,
    );
  });

  return failed.length;
}
