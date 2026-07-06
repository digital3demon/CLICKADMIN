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
  suggestedAttachmentIds: z
    .array(z.string())
    .describe("ID вложений из каталога письма, которые нужно прикрепить к наряду"),
  warnings: z.array(z.string()).describe("Предупреждения, если что-то непонятно или неоднозначно"),
});

export type OrderEmailExtractResult = z.infer<typeof OrderEmailExtractSchema>;

export type EmailAttachmentCatalogItem = {
  id: string;
  fileName: string;
  mimeType: string;
  size?: number;
};

export type PreResolvedClientIds = {
  clinicId: string | null;
  doctorId: string | null;
};

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

function formatAttachmentsForPrompt(attachments: EmailAttachmentCatalogItem[]) {
  if (attachments.length === 0) {
    return "Вложений в письме нет.";
  }
  const lines = attachments.map(
    (a) => `  "${a.id}": ${a.fileName} (${a.mimeType}${a.size != null ? `, ${a.size} B` : ""})`,
  );
  return `Вложения письма (ID -> файл):
{
${lines.join(",\n")}
}

В suggestedAttachmentIds укажи только ID из этого списка — файлы, которые логично прикрепить к наряду (сканы, фото, STL и т.п.). Если неясно — пустой массив.`;
}

export async function extractOrderFieldsFromEmail(
  tenantId: string,
  subject: string,
  textBody: string,
  options?: {
    fromAddress?: string | null;
    emailAttachments?: EmailAttachmentCatalogItem[];
    preResolved?: PreResolvedClientIds | null;
  },
): Promise<{ result: OrderEmailExtractResult | null; model: string; durationMs: number; error?: string; rawJson?: string }> {
  const settings = await getAiSettings(tenantId);
  if (!settings.enabled || !settings.apiKey) {
    return { result: null, model: "none", durationMs: 0, error: "AI is disabled" };
  }

  const catalog = await fetchClinicDoctorCatalog(tenantId);
  const catalogText = formatCatalogForPrompt(catalog);
  const attachments = options?.emailAttachments ?? [];
  const attachmentsText = formatAttachmentsForPrompt(attachments);
  const fromLine = options?.fromAddress?.trim()
    ? `Отправитель письма: ${options.fromAddress.trim()}`
    : "Отправитель письма: не указан";

  const preResolved = options?.preResolved;
  const clientBlock =
    preResolved?.clinicId != null || preResolved?.doctorId != null
      ? `Заказчик уже определён по почте отправителя — НЕ меняй:
- clinicId: ${JSON.stringify(preResolved.clinicId)}
- doctorId: ${JSON.stringify(preResolved.doctorId)}
Верни те же clinicId и doctorId в JSON.`
      : `${catalogText}

Определи clinicId и doctorId по тексту письма и отправителю.`;

  const prompt = `Ты — профессиональный ассистент зуботехнической лаборатории. Твоя задача — извлечь данные для нового наряда из текста письма от стоматологической клиники.

${fromLine}

${clientBlock}

${attachmentsText}

Тема письма: ${subject}
Текст письма:
${textBody}

Извлеки следующие поля и верни их СТРОГО в формате JSON:
- patientName: ФИО пациента (строка или null)
- clinicId: ID клиники (строка или null)
- doctorId: ID врача (строка или null)
- workDescription: Описание работы (строка или null). Собери сюда все конструкции, цвет, сроки сдачи и особые пожелания.
- urgent: true, если есть пометка о срочности (срочно, cito, asap), иначе false (boolean или null)
- suggestedAttachmentIds: массив ID вложений из каталога выше
- warnings: массив строк с предупреждениями

ВАЖНО:
- Не выдумывай то, чего нет в тексте. Если поля нет, верни null (для suggestedAttachmentIds — []).
- clinicId и doctorId только из справочника или preResolved выше.
- Верни ТОЛЬКО валидный JSON, без markdown-разметки.`;

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

export function mergeAiPredictionJson(
  ai: OrderEmailExtractResult | Record<string, unknown> | null,
  meta: {
    preResolved?: PreResolvedClientIds | null;
    matchedBySourceEmail?: boolean;
    sourceEmailAmbiguous?: boolean;
  },
): Record<string, unknown> {
  const base: Record<string, unknown> =
    ai && typeof ai === "object"
      ? { ...(ai as Record<string, unknown>) }
      : {};
  if (meta.matchedBySourceEmail && meta.preResolved) {
    base.clinicId = meta.preResolved.clinicId;
    base.doctorId = meta.preResolved.doctorId;
    base.matchedBySourceEmail = true;
  }
  if (meta.sourceEmailAmbiguous) {
    base.sourceEmailAmbiguous = true;
  }
  if (!Array.isArray(base.suggestedAttachmentIds)) {
    base.suggestedAttachmentIds = [];
  }
  return base;
}
