import type { PrismaClient } from "@prisma/client";
import { resolveClientIdsFromPrediction } from "./ai-order-draft-from-prediction";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";
import { getOpenRouterClient } from "./openrouter-client";

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
      tenant: true,
    },
  });

  if (!prediction || !prediction.order || !prediction.email || !prediction.tenant.openRouterApiKey) {
    return;
  }

  const json = prediction.predictionJson as Record<string, any>;
  if (!json || typeof json !== "object") return;

  // 1. Сравниваем состав
  const aiConstructions = Array.isArray(json.resolvedConstructions) ? json.resolvedConstructions : [];
  const realConstructions = prediction.order.constructions;

  const aiSummary = aiConstructions
    .map((c: any) => `${c.quantity}x ${c.priceListItem?.name || "Неизвестно"}`)
    .sort()
    .join(", ");
  
  const realSummary = realConstructions
    .map((c) => `${c.quantity}x ${c.priceListItem?.name || "Неизвестно"}`)
    .sort()
    .join(", ");

  // Если состав совпадает, считаем, что всё ок (пока упрощенно)
  if (aiSummary === realSummary) {
    return;
  }

  // 2. Ищем врача
  const emailMatch = await resolveClientIdsFromOrderSourceEmail(
    db,
    tenantId,
    prediction.email.fromAddress,
    { preferOrderId: prediction.orderId }
  );

  const resolvedIds = resolveClientIdsFromPrediction(json, emailMatch.matched ? emailMatch : undefined);
  const doctorId = resolvedIds.doctorId || prediction.order.doctorId;

  if (!doctorId) return;

  // 3. Формируем запрос к ИИ
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
    const openRouter = getOpenRouterClient(prediction.tenant.openRouterApiKey);
    const response = await openRouter.chat.completions.create({
      model: "google/gemini-2.5-flash", // Используем быструю и дешевую модель для рефлексии
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
    });

    const lesson = response.choices[0]?.message?.content?.trim();

    if (lesson) {
      // 4. Сохраняем правило в карточку врача
      const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
      if (doctor) {
        const existingLessons = doctor.aiLessons ? doctor.aiLessons.split("\n").filter(Boolean) : [];
        
        // Избегаем дубликатов
        if (!existingLessons.includes(lesson)) {
          existingLessons.push(lesson);
          // Храним максимум 5 последних уроков, чтобы не раздувать промпт
          const newLessons = existingLessons.slice(-5).join("\n");
          
          await db.doctor.update({
            where: { id: doctorId },
            data: { aiLessons: newLessons },
          });
          console.log(`[AI Self-Correction] Added lesson for doctor ${doctorId}: ${lesson}`);
        }
      }
    }
  } catch (e) {
    console.error("[AI Self-Correction] Error generating lesson:", e);
  }
}
