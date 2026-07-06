import "server-only";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { extractOrderFieldsFromEmail } from "./order-email-extract";
import { logger } from "@/lib/server/logger";
import { mailHtmlToText, cleanMailTextBody } from "@/lib/mail/mail-text-cleanup";

export async function runShadowPredictionInBackground(
  tenantId: string,
  orderId: string,
  emailId: string,
) {
  // Выполняем асинхронно, не блокируя основной поток
  setTimeout(async () => {
    try {
      const db = await getOrdersPrisma();
      
      // Проверяем, включен ли ИИ
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { aiEnabled: true, openRouterApiKey: true },
      });
      if (!tenant?.aiEnabled || !tenant?.openRouterApiKey) {
        return;
      }

      // Получаем письмо
      const email = await db.email.findUnique({
        where: { id: emailId },
        select: { subject: true, textBody: true, htmlBody: true, preview: true },
      });
      if (!email) return;

      const subject = email.subject || "(без темы)";
      const textBody =
        cleanMailTextBody(email.textBody) ||
        mailHtmlToText(email.htmlBody) ||
        cleanMailTextBody(email.preview) ||
        "";

      if (!textBody.trim()) return;

      const { result, model, durationMs, error, rawJson } = await extractOrderFieldsFromEmail(
        tenantId,
        subject,
        textBody,
      );

      // Сохраняем результат в БД
      await db.aiOrderPrediction.create({
        data: {
          tenantId,
          orderId,
          emailId,
          model,
          durationMs,
          predictionJson: rawJson ? JSON.parse(rawJson) : (result as any) ?? {},
          error,
        },
      });

      logger.info(
        { orderId, emailId, model, durationMs, ok: !error },
        "AI shadow prediction completed",
      );
    } catch (e: any) {
      logger.error({ err: e, orderId, emailId }, "AI shadow prediction failed");
    }
  }, 0);
}
