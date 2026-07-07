import "server-only";
import type { PrismaClient } from "@prisma/client";
import { resolveClientIdsFromPrediction } from "@/lib/ai-order-draft-from-prediction";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";
import { chatCompletion } from "@/lib/llm/llm-client";
import { getAiSettings } from "@/lib/llm/llm-config";
import {
  summarizeAiConstructions,
  summarizeOrderConstructions,
  type AiConstructionLine,
} from "@/lib/llm/prediction-composition-summary";
import { buildDatasetJsonlLine } from "@/lib/llm/dataset-export";
import { appendToDatasetFile } from "@/lib/llm/dataset-storage";

async function markSelfCorrectionDone(
  db: PrismaClient,
  predictionId: string,
  refHash: string,
): Promise<void> {
  await db.aiOrderPrediction.update({
    where: { id: predictionId },
    data: {
      selfCorrectionAt: new Date(),
      selfCorrectionRefHash: refHash,
    },
  });
}

export async function analyzePredictionError(
  db: PrismaClient,
  tenantId: string,
  predictionId: string,
) {
  const prediction = await db.aiOrderPrediction.findUnique({
    where: { id: predictionId, tenantId },
    include: {
      order: {
        include: {
          constructions: {
            include: { priceListItem: true },
          },
          clinic: true,
          doctor: true,
        },
      },
      email: true,
    },
  });

  if (!prediction || !prediction.order || !prediction.email) {
    return;
  }

  const settings = await getAiSettings(tenantId);
  if (!settings.enabled || !settings.apiKey) {
    return;
  }

  const json = prediction.predictionJson as Record<string, unknown>;
  if (!json || typeof json !== "object") return;

  const aiConstructions = Array.isArray(json.resolvedConstructions)
    ? (json.resolvedConstructions as AiConstructionLine[])
    : [];
  const realConstructions = prediction.order.constructions;

  const aiSummary = summarizeAiConstructions(aiConstructions);
  const realSummary = summarizeOrderConstructions(realConstructions);
  const refHash = realSummary;

  if (
    prediction.selfCorrectionRefHash === refHash &&
    prediction.selfCorrectionAt != null
  ) {
    return;
  }

  // 1. Запись в датасет (Ground Truth)
  // Мы делаем это всегда при изменении refHash, независимо от того, ошибся ИИ или нет.
  try {
    const jsonlLine = await buildDatasetJsonlLine(db, tenantId, prediction.order, [prediction.email]);
    if (jsonlLine) {
      await appendToDatasetFile(tenantId, jsonlLine);
    }
  } catch (e) {
    console.error("[AI Dataset] Error appending to dataset:", e);
  }

  // 2. Генерация уроков (Self-Correction)
  // Это делаем только если ИИ ошибся в составе.
  if (aiSummary === realSummary) {
    await markSelfCorrectionDone(db, predictionId, refHash);
    return;
  }

  const emailMatch = await resolveClientIdsFromOrderSourceEmail(
    db,
    tenantId,
    prediction.email.fromAddress,
    { preferOrderId: prediction.orderId },
  );

  const resolvedIds = resolveClientIdsFromPrediction(
    json,
    emailMatch.matched ? emailMatch : undefined,
  );
  const doctorId = resolvedIds.doctorId || prediction.order.doctorId;

  if (!doctorId) {
    await markSelfCorrectionDone(db, predictionId, refHash);
    return;
  }

  const prompt = `
Ты — AI-ассистент в зуботехнической лаборатории. Твоя задача — проанализировать свою ошибку при разборе наряда и сделать короткий вывод на будущее.

Текст письма от клиента:
"""
${prediction.email.subject ? `Тема: ${prediction.email.subject}\n` : ""}${prediction.email.textBody || prediction.email.preview || ""}
"""

Твой ответ (состав работ):
${aiSummary || "Ничего не найдено"}

Правильный ответ (как сохранил администратор):
${realSummary || "Ничего не найдено"}

Сделай ОДИН короткий, четкий вывод (максимум 2 предложения), который поможет тебе в будущем не совершать эту ошибку для этого клиента. 
Например: "Если врач пишет 'марко роса', это всегда 'Аппарат Марко Росса/HAAS титан', а не коронка."
Не пиши извинений, только само правило.
`.trim();

  try {
    const response = await chatCompletion(settings, {
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    if (!response.ok) {
      console.error("[AI Self-Correction] Error generating lesson:", response.error);
      return;
    }

    const lesson = response.content.trim();
    if (lesson) {
      const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
      if (doctor) {
        const existingLessons = doctor.aiLessons
          ? doctor.aiLessons.split("\n").filter(Boolean)
          : [];

        if (!existingLessons.includes(lesson)) {
          existingLessons.push(lesson);
          const newLessons = existingLessons.slice(-5).join("\n");

          await db.doctor.update({
            where: { id: doctorId },
            data: { aiLessons: newLessons },
          });
          console.log(
            `[AI Self-Correction] Added lesson for doctor ${doctorId}: ${lesson}`,
          );
        }
      }
    }

    await markSelfCorrectionDone(db, predictionId, refHash);
  } catch (e) {
    console.error("[AI Self-Correction] Error generating lesson:", e);
  }
}
