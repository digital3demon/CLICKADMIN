import "server-only";
import { z } from "zod";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { chatCompletion, stripMarkdownFences } from "./llm-client";
import { getAiSettings } from "./llm-config";

import type { ClientHistoryContext } from "./client-history-context";

const FdiToothCodeSchema = z.union([z.string(), z.number()]).transform((value) => String(value).trim());

/** LLM часто шлёт один зуб строкой/числом вместо массива — нормализуем до string[]|null. */
function normalizeTeethFdiInput(value: unknown): unknown {
  if (value == null) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === "number" || typeof value === "string") {
    const str = String(value).trim();
    if (!str) return null;
    if (/[,;\s]/.test(str)) {
      return str
        .split(/[,;\s]+/)
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [str];
  }
  return null;
}

const TeethFdiSchema = z.preprocess(
  normalizeTeethFdiInput,
  z.array(FdiToothCodeSchema).nullable().optional(),
);

const CompositionHintSchema = z.object({
  nameHint: z.string().describe("Название работы как в письме или уточнённый синоним для прайса"),
  quantity: z.number().nullable().optional(),
  teethFdi: TeethFdiSchema,
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
  awaitingData: z
    .object({
      isAwaiting: z.boolean(),
      reason: z
        .string()
        .nullable()
        .describe(
          "Что именно обещают прислать (например: 'КТ', 'сканы', 'ссылку на Яндекс.Диск')",
        ),
    })
    .nullable()
    .optional(),
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
  pdfOrderText?: string | null;
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
    const { doctorParticulars, doctorAiParticulars, doctorAiLessons, doctorHistory, patientHistory } = opts.historyContext;
    
    if (doctorParticulars?.trim() || doctorAiParticulars?.trim() || doctorAiLessons?.trim()) {
      historyBlock += `\n[ОСОБЕННОСТИ ВРАЧА]\n`;
      if (doctorParticulars?.trim()) historyBlock += `${doctorParticulars.trim()}\n`;
      if (doctorAiParticulars?.trim()) historyBlock += `${doctorAiParticulars.trim()}\n`;
      if (doctorAiLessons?.trim()) historyBlock += `\n[ВАЖНО! ПРОШЛЫЕ ОШИБКИ ИИ ПО ЭТОМУ ВРАЧУ]\n${doctorAiLessons.trim()}\n`;
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

  return `Ты — старший администратор и опытный зубной техник зуботехнической лаборатории. Извлеки данные для нового наряда из писем клиники и PDF-нарядов.

${fromLine}

${clientBlock}
${historyBlock}
${opts.attachmentsText}
${opts.pdfOrderText?.trim() ? `\nЗаполненный PDF наряд (электронная форма CLICK — приоритетнее пустого текста письма):\n${opts.pdfOrderText.trim()}\n` : ""}

Письма (--- между блоками):
${opts.emailsText}

Верни СТРОГО JSON:
- patientName: ФИО первого пациента (string|null). Если в одном письме реально два отдельных заказа на разных пациентов — только первый + warning. НЕ считай вторым пациентом упоминание «отправить/отвезти работу вместе с предыдущим заказом (ФИО…)» — это просьба об общей доставке.
- clinicId, doctorId: из справочника или preResolved
- clientOrderText: дословный текст заказа клиента (конструкции, зубы, цвет, пожелания). Без подписей, без «Письмо:/От:/Дата:/Fwd:»
- patientAppointmentAt: ISO8601 дата выдачи/доставки/приёма или null. Несколько дат («12.06 или 15.06») → первая + warning
- urgent: true если «срочно/cito/asap/urgent/!!!» ИЛИ «на завтра/сегодня/к пятнице»
- hasScans, hasCt, hasMri, hasPhoto: boolean|null — по тексту и вложениям
- suggestedAttachmentIds: string[] — ID из каталога (только явный выбор; для .stl обязательно)
- compositionHints: [{ nameHint, quantity?, teethFdi? }] — все позиции работ. teethFdi — строки FDI («53», не число 53).
- confidenceScore: 0–100 — насколько уверен в разборе
- warnings: string[] — неоднозначности + логика («коронка без сканов/цвета», «несколько пациентов» и т.п.). Для «отправить вместе с предыдущим заказом (ФИО…)» — warning про уточнение сроков (подогнать эту работу под тот заказ или сдвинуть тот), а не «несколько пациентов».
- awaitingData: null или { isAwaiting: true, reason: string|null } — ТОЛЬКО если клиент явно обещает дослать данные ПОЗЖЕ («сканы пришлю позже», «КТ дошлю», «ссылку пришлю») и их ещё нет в письме. reason — что именно обещают (КТ, МРТ, сканы, ссылка). Если в тексте уже есть https://disk.yandex.ru/… или «прикрепляю ссылку на яндекс диск, где есть КТ, сканы» — awaitingData = null (данные уже приложены).

Правила экспертизы:
- ФОКУС НА ПРАЙС: nameHint — максимально близко к точному названию из каталога/истории врача, не выдумывай новых названий.
- БЕЗ ДУБЛЕЙ ПРАЙСА: одна работа = одна строка compositionHints — самая точная позиция. Не добавляй и «сплинт», и «сплинт сложный»; и «коронка emax», и «коронка emax премиум» — только одну, наиболее подходящую по тексту заказа.
- ВАРИАНТЫ ОДНОЙ РАБОТЫ: не добавляй две строки из одной семьи («немедленная нагрузка на винтовой фиксации» и «немедленная нагрузка с армированием») — только ту, что явно в заказе. Если неясно — одну, более простую/дешёвую по смыслу, не выдумывай дорогой вариант «на всякий случай». При сомнении CRM выберет более дешёвую позицию прайса.
- ОТРИЦАНИЕ: «без ключа», «без силиконового ключа», «ключ не нужен» — эту позицию НЕ включай в compositionHints. Отрицание важнее любых ассоциаций с прайсом.
- ЧЕЛЮСТИ: ВЧ/НЧ/верхняя/нижняя — обычно НЕ отдельные позиции прайса. Одна работа на обе челюсти → одна строка compositionHints с quantity: 2, а не две строки «… ВЧ» и «… НЧ».
- СОКРАЩЕНИЯ: если врач пишет бытовое название («капа», «коронка emax»), подбери ближайшую позицию из каталога/истории — не придумывай синоним с нуля.
- PDF НАРЯД: если есть блок «PDF наряд» — patientName, clinicHint/doctorHint, clientOrderText, compositionHints и даты бери оттуда; имя файла «Фамилия Имя Отчество.pdf» тоже может быть пациентом. ВАЖНО: игнорируй статические заголовки блоков (например, «НЕМЕДЛЕННАЯ НАГРУЗКА», «ПЛАНИРОВАНИЕ ХИРУРГИЧЕСКОГО ШАБЛОНА»), если к ним не относятся заполненные врачом поля или галочки. Не добавляй работы в compositionHints только из-за того, что их название напечатано на пустом бланке.
- ТЕМА ПИСЬМА: часто формат «{работа из прайса} {фамилия пациента} {инициал}», напр. «Марко Росса Джалилов М.» → compositionHints: «Аппарат Марко Росса…», patientName: «Джалилов М.». «Марко Росса», «Андрезен», «апп» — это работы, НЕ ФИО.
- КЛИЕНТ ПО ПОЧТЕ: если заказчик уже определён по отправителю (preResolved) — не ищи врача/клинику в теме письма и не пиши warning «не определен врач из темы». В теме после названия работы обычно только пациент.
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
  const primarySubject =
    emailBlocks.find((b) => b.isPrimary)?.subject?.trim() ||
    emailBlocks[0]?.subject?.trim() ||
    "";
  const prompt = `Извлеки ФИО пациента из письма. Верни только JSON с полем patientName.

Важно:
- В теме часто «{работа} {фамилия} {инициал}». «Марко Росса», «Андрезен», «апп» — работы, не пациент.
- Если после названия работы осталась фамилия с инициалом — это patientName.
- Не включай в patientName названия работ из прайса.

${primarySubject ? `Тема письма: ${primarySubject}\n` : ""}
Письма:
${emailsText}

Верни СТРОГО JSON:
- patientName: ФИО пациента (string|null)
`;

  const response = await chatCompletion(settings, {
    messages: [{ role: "user", content: prompt }],
    responseFormat: "json_object",
    maxTokens: 512,
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
    pdfOrderText?: string | null;
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
    pdfOrderText: options?.pdfOrderText,
    preResolved: options?.preResolved,
    historyContext: options?.historyContext,
  });

  const response = await chatCompletion(settings, {
    messages: [{ role: "user", content: prompt }],
    responseFormat: "json_object",
    maxTokens: 4096,
  });

  if (!response.ok) {
    return {
      result: null,
      model: "none",
      durationMs: response.durationMs,
      error: response.error,
    };
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
