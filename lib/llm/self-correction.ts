import "server-only";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { analyzePredictionError } from "@/lib/llm/analyze-prediction-error";
import { logger } from "@/lib/server/logger";

const tenantQueues = new Map<string, Promise<void>>();
const LLM_GAP_MS = 2000;

function enqueueSelfCorrectionJob(tenantId: string, job: () => Promise<void>): void {
  const previous = tenantQueues.get(tenantId) ?? Promise.resolve();
  const next = previous
    .then(job)
    .catch((err) => {
      logger.error({ err, tenantId }, "AI self-correction queue job failed");
    });
  tenantQueues.set(tenantId, next);
}

/** Фоновое сравнение последнего предсказания с эталоном админа (очередь на tenant). */
export function runSelfCorrectionForOrderInBackground(
  tenantId: string,
  orderId: string,
): void {
  enqueueSelfCorrectionJob(tenantId, async () => {
    const db = await getOrdersPrisma();
    const prediction = await db.aiOrderPrediction.findFirst({
      where: { tenantId, orderId, error: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!prediction) return;

    await analyzePredictionError(db, tenantId, prediction.id);
    await new Promise((resolve) => setTimeout(resolve, LLM_GAP_MS));
  });
}

/** Догнать старые наряды, где эталон ещё не сравнивали с предсказанием. */
export function runSelfCorrectionBatchInBackground(
  tenantId: string,
  predictionIds: string[],
): void {
  if (predictionIds.length === 0) return;

  enqueueSelfCorrectionJob(tenantId, async () => {
    const db = await getOrdersPrisma();
    logger.info(
      { tenantId, count: predictionIds.length },
      "AI self-correction batch started",
    );

    for (const predictionId of predictionIds) {
      try {
        await analyzePredictionError(db, tenantId, predictionId);
      } catch (err) {
        logger.error({ err, tenantId, predictionId }, "AI self-correction batch item failed");
      }
      await new Promise((resolve) => setTimeout(resolve, LLM_GAP_MS));
    }

    logger.info({ tenantId, count: predictionIds.length }, "AI self-correction batch finished");
  });
}
