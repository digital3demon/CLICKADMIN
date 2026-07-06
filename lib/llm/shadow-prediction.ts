import "server-only";
import type { Prisma } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { runOrderEmailPrediction } from "./run-order-email-prediction";
import { logger } from "@/lib/server/logger";

export async function runShadowPredictionInBackground(
  tenantId: string,
  orderId: string,
  emailId: string,
) {
  setTimeout(async () => {
    try {
      const db = await getOrdersPrisma();

      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { aiEnabled: true, openRouterApiKey: true },
      });
      if (!tenant?.aiEnabled || !tenant?.openRouterApiKey) {
        return;
      }

      const run = await runOrderEmailPrediction(db, tenantId, emailId);
      if (!run) return;

      await db.aiOrderPrediction.create({
        data: {
          tenantId,
          orderId,
          emailId,
          model: run.model,
          durationMs: run.durationMs,
          predictionJson: run.predictionJson as Prisma.InputJsonValue,
          error: run.error,
        },
      });

      logger.info(
        { orderId, emailId, model: run.model, durationMs: run.durationMs, ok: !run.error },
        "AI shadow prediction completed",
      );
    } catch (e: any) {
      logger.error({ err: e, orderId, emailId }, "AI shadow prediction failed");
    }
  }, 0);
}
