import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getAiSettings } from "@/lib/llm/llm-config";
import { chatCompletion, stripMarkdownFences } from "@/lib/llm/llm-client";
import { fetchDoctorHistory } from "@/lib/llm/client-history-context";
import { logger } from "@/lib/server/logger";

export async function POST(req: Request) {
  try {
    // В реальном приложении здесь должна быть проверка API ключа для cron (например, Authorization: Bearer CRON_SECRET)
    // Для демо-целей или внутреннего вызова пока пропускаем жесткую проверку, но в проде это обязательно.

    const db = await getOrdersPrisma();
    
    // Получаем всех активных тенантов, у которых включен ИИ
    const tenants = await db.tenant.findMany({
      where: { aiEnabled: true, aiApiKey: { not: null } },
      select: { id: true },
    });

    let processedCount = 0;

    for (const tenant of tenants) {
      const tenantId = tenant.id;
      const settings = await getAiSettings(tenantId);
      if (!settings.enabled || !settings.apiKey) continue;

      // Ищем врачей, у которых есть хотя бы 5 заказов, но particulars пустой или давно не обновлялся
      // Для простоты сейчас берем врачей с пустым particulars, у которых есть заказы
      const doctorsToProfile = await db.doctor.findMany({
        where: {
          tenantId,
          particulars: null,
          orders: { some: {} },
        },
        take: 10, // Ограничиваем батч
        select: { id: true, fullName: true },
      });

      for (const doctor of doctorsToProfile) {
        const history = await fetchDoctorHistory(db, tenantId, doctor.id, 20);
        if (history.length < 3) continue; // Слишком мало данных для профилирования

        const historyText = history
          .map((h) => `- Письмо: "${h.text}"\n  Состав: ${h.constructions}`)
          .join("\n\n");

        const prompt = `Ты — старший администратор зуботехнической лаборатории. Проанализируй историю заказов врача и составь его профиль (особенности).
Этот профиль будет использоваться другим ИИ для лучшего понимания будущих писем от этого врача.

Врач: ${doctor.fullName}

История недавних заказов (Текст письма -> Итоговый состав прайса):
${historyText}

Твоя задача:
Напиши краткую выжимку (3-5 предложений) о том, как этот врач формулирует заказы.
Укажи:
1. Какие сокращения он использует и что они значат (например: "вч" -> верхняя челюсть, "апп" -> Аппарат Андрезена).
2. Какие конструкции он заказывает чаще всего.
3. Любые другие специфичные особенности его почерка.

Верни ТОЛЬКО текст профиля, без приветствий и лишних слов.`;

        const response = await chatCompletion(settings, {
          messages: [{ role: "user", content: prompt }],
        });

        if (response.ok) {
          const profile = stripMarkdownFences(response.content).trim();
          if (profile) {
            await db.doctor.update({
              where: { id: doctor.id },
              data: { particulars: profile },
            });
            processedCount++;
            logger.info({ doctorId: doctor.id }, "Doctor profile generated via cron");
          }
        }
      }
    }

    return NextResponse.json({ success: true, processedCount });
  } catch (e: any) {
    logger.error({ err: e }, "Cron profile-doctors failed");
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
