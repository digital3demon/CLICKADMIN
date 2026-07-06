import "server-only";
import { z } from "zod";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { chatCompletion, stripMarkdownFences } from "./openrouter-client";
import { getAiSettings } from "./openrouter-config";

import type { ClientHistoryContext } from "./client-history-context";

const CompositionHintSchema = z.object({
  nameHint: z.string().describe("Название работы как в письме или уточнённый синоним для прайса"),
  quantity: z.number().nullable().optional(),
  teethFdi: z.array(z.string()).nullable().optional(),
});

export const OrderEmailExtractSchema = z.object({
  patientName: z.string().nullable().describe("ФИО пациента; при нескольких — только первого"),
  clinicId: z.string().nullable().describe("ID клиники из справочника или null"),
  doctorId: z.string().nullable().describe("ID врача из справочника или null"),
  clientOrderText: z
    .string()
    .nullable()
    .describe("Текст заказа клиента дословно, без подписей и без «Письмо:/От:/Дата:»"),
  patientAppointmentAt: z
    .string()
    .nullable()
    .describe("Дата выдачи/доставки/приёма ISO8601 или null"),
  urgent: z.boolean().nullable().describe("Срочность"),
  hasScans: z.boolean().nullable().optional(),
  hasCt: z.boolean().nullable().optional(),
  hasMri: z.boolean().nullable().optional(),
  hasPhoto: z.boolean().nullable().optional(),
  suggestedAttachmentIds: z
    .array(z.string())
    .describe("ID вложений из каталога — только явный выбор"),
  compositionHints: z.array(CompositionHintSchema).optional().default([]),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Уверенность в разборе 0–100"),
  warnings: z.array(z.string()).describe("Предупреждения и логические проверки"),
  /** @deprecated legacy — дублирует clientOrderText */
  workDescription: z.string().nullable().optional(),
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

export type EmailBlockForExtract = {
  id: string;
  subject: string | null;
  textBody: string;
  isPrimary?: boolean;
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
    return "Вложений нет.";
  }
  const lines = attachments.map(
    (a) => `  "${a.id}": ${a.fileName} (${a.mimeType}${a.size != null ? `, ${a.size} B` : ""})`,
  );
  return `Каталог вложений (ID -> файл):
{
${lines.join(",\n")}
}

Для каждого .stl / scan / скана укажи ID в suggestedAttachmentIds и hasScans: true.
Юрлицо и оплата заполняются CRM автоматически — не возвращай их.`;
}

function formatEmailBlocksForPrompt(blocks: EmailBlockForExtract[]): string {
  return blocks
    .map((b, i) => {
      const tag = b.isPrimary ? "[PRIMARY]" : `[Письмо ${i + 1}]`;
      return `${tag}
Тема: ${b.subject?.trim() || "(без темы)"}
---
${b.textBody.trim()}`;
    })
    .join("\n\n---\n\n");
}

/** Общий user-prompt для extract и export dataset (без вызова LLM). */
export function buildOrderEmailExtractUserPrompt(opts: {
  fromAddress?: string | null;
  catalogText: string;
  attachmentsText: string;
  emailsText: string;
  preResolved?: PreResolvedClientIds | null;
  historyContext?: ClientHistoryContext | null;
}): string {
  const fromLine = opts.fromAddress?.trim()
    ? `Отправитель основного письма: ${opts.fromAddress.trim()}`
    : "Отправитель: не указан";

  const preResolved = opts.preResolved;
  const clientBlock =
    preResolved?.clinicId != null || preResolved?.doctorId != null
      ? `Заказчик уже определён по почте отправителя — НЕ меняй:
- clinicId: ${JSON.stringify(preResolved.clinicId)}
- doctorId: ${JSON.stringify(preResolved.doctorId)}`
      : `${opts.catalogText}

Определи clinicId и doctorId по тексту и отправителю.`;

  let historyBlock = "";
  if (opts.historyContext) {
    const { doctorParticulars, doctorHistory, patientHistory } = opts.historyContext;
    
    if (doctorParticulars?.trim()) {
      historyBlock += `\n[ОСОБЕННОСТИ ВРАЧА]\n${doctorParticulars.trim()}\n`;
    }

    if (doctorHistory.length > 0) {
      historyBlock += `\n[ПОСЛЕДНИЕ ЗАКАЗЫ ВРАЧА (СЛОВАРЬ СОКРАЩЕНИЙ)]
Используй это как словарь: если врач пишет сокращение, посмотри, в какую позицию прайса (Состав) это превращалось раньше.
${doctorHistory.map((h) => `- Текст: "${h.text}" -> Состав: ${h.constructions}`).join("\n")}\n`;
    }

    if (patientHistory.length > 0) {
      historyBlock += `\n[ИСТОРИЯ ПАЦИЕНТА (ПРОДОЛЖЕНИЕ РАБОТЫ)]
Найдены прошлые наряды этого пациента. Учитывай их, чтобы понять контекст (например, если просят "продолжить" или "переделать").
${patientHistory.map((h) => `- Наряд ${h.orderNumber} от ${h.createdAt.slice(0, 10)} (${h.status}): ${h.constructions}`).join("\n")}\n`;
    }
  }

  return `Ты — старший администратор и опытный зубной техник зуботехнической лаборатории. Извлеки данные для нового наряда из писем клиники.

${fromLine}

${clientBlock}
${historyBlock}
${opts.attachmentsText}

Письма (--- между блоками):
${opts.emailsText}

Верни СТРОГО JSON:
- patientName: ФИО первого пациента (string|null). Если несколько пациентов — только первый + warning.
- clinicId, doctorId: из справочника или preResolved
- clientOrderText: дословный текст заказа клиента (конструкции, зубы, цвет, пожелания). Без подписей, без «Письмо:/От:/Дата:/Fwd:»
- patientAppointmentAt: ISO8601 дата выдачи/доставки/приёма или null. Несколько дат («12.06 или 15.06») → первая + warning
- urgent: true если «срочно/cito/asap/urgent/!!!» ИЛИ «на завтра/сегодня/к пятнице»
- hasScans, hasCt, hasMri, hasPhoto: boolean|null — по тексту и вложениям
- suggestedAttachmentIds: string[] — ID из каталога (только явный выбор; для .stl обязательно)
- compositionHints: [{ nameHint, quantity?, teethFdi? }] — все позиции работ.
- confidenceScore: 0–100 — насколько уверен в разборе
- warnings: string[] — неоднозначности + логика («коронка без сканов/цвета», «несколько пациентов» и т.п.)

Правила экспертизы:
- ФОКУС НА ПРАЙС: Для compositionHints используй "Историю заказов врача" как словарь. Если врач пишет нечетко, подбирай точное название из истории.
- ЛОГИКА: Если заказана коронка/модель, но нет ни сканов (.stl), ни слепков (упоминания в тексте) — добавь warning.
- Не выдумывай факты. Пустое → null или [].
- Юрлицо и оплата — не возвращай.
- Срок лаборатории не считай — только patientAppointmentAt.
- Только валидный JSON, без markdown.`;
}

export async function loadClinicDoctorCatalogText(tenantId: string): Promise<string> {
  const catalog = await fetchClinicDoctorCatalog(tenantId);
  return formatCatalogForPrompt(catalog);
}

export { formatAttachmentsForPrompt, formatEmailBlocksForPrompt };

export async function extractPatientNameOnly(
  tenantId: string,
  emailBlocks: EmailBlockForExtract[],
): Promise<{ patientName: string | null; durationMs: number; error?: string }> {
  const settings = await getAiSettings(tenantId);
  if (!settings.enabled || !settings.apiKey) {
    return { patientName: null, durationMs: 0, error: "AI is disabled" };
  }

  if (emailBlocks.length === 0) {
    return { patientName: null, durationMs: 0, error: "Empty email blocks" };
  }

  const emailsText = formatEmailBlocksForPrompt(emailBlocks);
  const prompt = `Извлеки ФИО пациента из текста писем. Верни только JSON с полем patientName. Если пациентов несколько — верни первого. Если нет — верни null.

Письма:
${emailsText}

Верни СТРОГО JSON:
- patientName: ФИО пациента (string|null)
`;

  const response = await chatCompletion(settings, {
    messages: [{ role: "user", content: prompt }],
    responseFormat: "json_object",
  });

  if (!response.ok) {
    return { patientName: null, durationMs: response.durationMs, error: response.error };
  }

  try {
    const rawJson = stripMarkdownFences(response.content);
    const parsed = JSON.parse(rawJson);
    return {
      patientName: typeof parsed.patientName === "string" ? parsed.patientName.trim() : null,
      durationMs: response.durationMs,
    };
  } catch (e: any) {
    return { patientName: null, durationMs: response.durationMs, error: e.message };
  }
}

export async function extractOrderFieldsFromEmail(
  tenantId: string,
  emailBlocks: EmailBlockForExtract[],
  options?: {
    fromAddress?: string | null;
    emailAttachments?: EmailAttachmentCatalogItem[];
    preResolved?: PreResolvedClientIds | null;
    historyContext?: ClientHistoryContext | null;
  },
): Promise<{
  result: OrderEmailExtractResult | null;
  model: string;
  durationMs: number;
  error?: string;
  rawJson?: string;
}> {
  const settings = await getAiSettings(tenantId);
  if (!settings.enabled || !settings.apiKey) {
    return { result: null, model: "none", durationMs: 0, error: "AI is disabled" };
  }

  if (emailBlocks.length === 0) {
    return { result: null, model: "none", durationMs: 0, error: "Empty email blocks" };
  }

  const catalog = await fetchClinicDoctorCatalog(tenantId);
  const catalogText = formatCatalogForPrompt(catalog);
  const attachments = options?.emailAttachments ?? [];
  const attachmentsText = formatAttachmentsForPrompt(attachments);
  const emailsText = formatEmailBlocksForPrompt(emailBlocks);

  const prompt = buildOrderEmailExtractUserPrompt({
    fromAddress: options?.fromAddress,
    catalogText,
    attachmentsText,
    emailsText,
    preResolved: options?.preResolved,
    historyContext: options?.historyContext,
  });

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
    return {
      result: null,
      model: response.model,
      durationMs: response.durationMs,
      error: `JSON parse/validation error: ${e.message}`,
      rawJson,
    };
  }
}

/** @deprecated используй emailBlocks; совместимость для старых вызовов */
export async function extractOrderFieldsFromSingleEmail(
  tenantId: string,
  subject: string,
  textBody: string,
  options?: Parameters<typeof extractOrderFieldsFromEmail>[2],
) {
  return extractOrderFieldsFromEmail(
    tenantId,
    [{ id: "primary", subject, textBody, isPrimary: true }],
    options,
  );
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
  if (!Array.isArray(base.compositionHints)) {
    base.compositionHints = [];
  }
  if (typeof base.clientOrderText !== "string" && typeof base.workDescription === "string") {
    base.clientOrderText = base.workDescription;
  }
  return base;
}
