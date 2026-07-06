import "server-only";
import { z } from "zod";
import { chatCompletion, stripMarkdownFences } from "./openrouter-client";
import { getAiSettings } from "./openrouter-config";

export const OrderEmailExtractSchema = z.object({
  patientName: z.string().nullable().describe("ФИО пациента, если есть в тексте"),
  clinicHint: z.string().nullable().describe("Название клиники, если есть в тексте"),
  doctorHint: z.string().nullable().describe("ФИО врача, если есть в тексте"),
  workDescription: z.string().nullable().describe("Описание работы (конструкции, цвет, пожелания)"),
  urgent: z.boolean().nullable().describe("Есть ли пометка о срочности (срочно, cito, asap и т.п.)"),
  warnings: z.array(z.string()).describe("Предупреждения, если что-то непонятно или неоднозначно"),
});

export type OrderEmailExtractResult = z.infer<typeof OrderEmailExtractSchema>;

export async function extractOrderFieldsFromEmail(
  tenantId: string,
  subject: string,
  textBody: string,
): Promise<{ result: OrderEmailExtractResult | null; model: string; durationMs: number; error?: string; rawJson?: string }> {
  const settings = await getAiSettings(tenantId);
  if (!settings.enabled || !settings.apiKey) {
    return { result: null, model: "none", durationMs: 0, error: "AI is disabled" };
  }

  const prompt = `Ты — профессиональный ассистент зуботехнической лаборатории. Твоя задача — извлечь данные для нового наряда из текста письма от стоматологической клиники.

Тема письма: ${subject}
Текст письма:
${textBody}

Извлеки следующие поля и верни их СТРОГО в формате JSON:
- patientName: ФИО пациента (строка или null)
- clinicHint: Название клиники (строка или null)
- doctorHint: ФИО врача (строка или null)
- workDescription: Описание работы (строка или null). Собери сюда все конструкции, цвет, сроки сдачи и особые пожелания.
- urgent: true, если есть пометка о срочности (срочно, cito, asap), иначе false (boolean или null)
- warnings: массив строк с предупреждениями (например, если в письме два разных пациента, или текст слишком короткий/непонятный).

ВАЖНО:
- Не выдумывай то, чего нет в тексте. Если поля нет, верни null.
- Верни ТОЛЬКО валидный JSON, без markdown-разметки и без дополнительных рассуждений.`;

  const response = await chatCompletion(settings, {
    messages: [{ role: "user", content: prompt }],
    responseFormat: "json_object",
  });

  if (!response.ok) {
    return { result: null, model: "none", durationMs: response.durationMs, error: response.error };
  }

  const rawJson = stripMarkdownFences(response.content);
  
  try {
    const parsed = JSON.parse(rawJson);
    const validated = OrderEmailExtractSchema.parse(parsed);
    return { result: validated, model: response.model, durationMs: response.durationMs, rawJson };
  } catch (e: any) {
    return { result: null, model: response.model, durationMs: response.durationMs, error: `JSON parse/validation error: ${e.message}`, rawJson };
  }
}
