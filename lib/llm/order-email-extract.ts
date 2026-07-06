import "server-only";
import { z } from "zod";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { chatCompletion, stripMarkdownFences } from "./openrouter-client";
import { getAiSettings } from "./openrouter-config";

export const OrderEmailExtractSchema = z.object({
  patientName: z.string().nullable().describe("ФИО пациента, если есть в тексте"),
  clinicId: z.string().nullable().describe("ID клиники из справочника или null"),
  doctorId: z.string().nullable().describe("ID врача из справочника или null"),
  workDescription: z.string().nullable().describe("Описание работы (конструкции, цвет, пожелания)"),
  urgent: z.boolean().nullable().describe("Есть ли пометка о срочности (срочно, cito, asap и т.п.)"),
  warnings: z.array(z.string()).describe("Предупреждения, если что-то непонятно или неоднозначно"),
});

export type OrderEmailExtractResult = z.infer<typeof OrderEmailExtractSchema>;

async function fetchClinicDoctorCatalog(tenantId: string) {
  const clientsPrisma = await getClientsPrisma();
  const [clinics, doctors] = await Promise.all([
    clientsPrisma.clinic.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    clientsPrisma.doctor.findMany({
      where: { tenantId },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);
  return { clinics, doctors };
}

function formatCatalogForPrompt(catalog: Awaited<ReturnType<typeof fetchClinicDoctorCatalog>>) {
  const clinicLines = catalog.clinics.map((c) => `  "${c.id}": ${c.name}`);
  const doctorLines = catalog.doctors.map((d) => `  "${d.id}": ${d.fullName}`);
  return `Справочник клиник (ID -> название):
{
${clinicLines.join(",\n")}
}

Справочник врачей (ID -> ФИО):
{
${doctorLines.join(",\n")}
}

Для частной практики (без клиники) укажи clinicId: null.`;
}

export async function extractOrderFieldsFromEmail(
  tenantId: string,
  subject: string,
  textBody: string,
): Promise<{ result: OrderEmailExtractResult | null; model: string; durationMs: number; error?: string; rawJson?: string }> {
  const settings = await getAiSettings(tenantId);
  if (!settings.enabled || !settings.apiKey) {
    return { result: null, model: "none", durationMs: 0, error: "AI is disabled" };
  }

  const catalog = await fetchClinicDoctorCatalog(tenantId);
  const catalogText = formatCatalogForPrompt(catalog);

  const prompt = `Ты — профессиональный ассистент зуботехнической лаборатории. Твоя задача — извлечь данные для нового наряда из текста письма от стоматологической клиники.

${catalogText}

Тема письма: ${subject}
Текст письма:
${textBody}

Извлеки следующие поля и верни их СТРОГО в формате JSON:
- patientName: ФИО пациента (строка или null)
- clinicId: ID клиники из справочника выше (строка или null). Выбирай только существующий ID; если клиника не найдена — null.
- doctorId: ID врача из справочника выше (строка или null). Выбирай только существующий ID; если врач не найден — null.
- workDescription: Описание работы (строка или null). Собери сюда все конструкции, цвет, сроки сдачи и особые пожелания.
- urgent: true, если есть пометка о срочности (срочно, cito, asap), иначе false (boolean или null)
- warnings: массив строк с предупреждениями (например, если в письме два разных пациента, или текст слишком короткий/непонятный).

ВАЖНО:
- Не выдумывай то, чего нет в тексте. Если поля нет, верни null.
- clinicId и doctorId должны быть ТОЛЬКО из справочника выше, не придумывай новые ID.
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
