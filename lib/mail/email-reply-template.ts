export type EmailReplyTemplateContext = {
  orderNumber: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
  /** Дата без времени (для «готовность к …» и т.п.). */
  date: string;
  dueDate: string;
  appointmentDate: string;
  originalSubject: string;
  originalFrom: string;
  /** Публичная витрина статуса заказа (QR с этикетки). */
  orderStatusUrl: string;
};

export const EMAIL_REPLY_TEMPLATE_QUICK_INSERT = [
  { label: "Номер наряда", token: "{{orderNumber}}" },
  { label: "Адрес", token: "{{clinicAddress}}" },
  { label: "Доктор", token: "{{doctorName}}" },
  { label: "Клиника", token: "{{clinicName}}" },
  { label: "Пациент", token: "{{patientName}}" },
  { label: "Дата", token: "{{date}}" },
  { label: "Дата записи", token: "{{appointmentDate}}" },
  { label: "Статус заказа (URL)", token: "{{orderStatusUrl}}" },
  { label: "Лабораторный срок", token: "{{dueDate}}" },
] as const;

const PLACEHOLDER_RE = /\{\{\s*(\w+)\s*\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderEmailReplyTemplate(
  template: string,
  context: EmailReplyTemplateContext,
  opts?: { html?: boolean },
): string {
  const html = opts?.html === true;
  return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const raw = context[key as keyof EmailReplyTemplateContext];
    const value = typeof raw === "string" ? raw : "";
    return html ? escapeHtml(value) : value;
  });
}

export function resolveReplyToSourceEmailId(
  sourceEmailIds: string[],
  replyToSourceEmailId: string | null | undefined,
): string | null {
  if (sourceEmailIds.length === 0) return null;
  const unique = Array.from(new Set(sourceEmailIds.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 1) return unique[0] ?? null;
  const reply = replyToSourceEmailId?.trim();
  if (!reply || !unique.includes(reply)) return null;
  return reply;
}

export function defaultReplySubject(originalSubject: string): string {
  const trimmed = originalSubject.trim();
  if (!trimmed) return "Re: Ваш заказ";
  return /^re:\s/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}

/** Подстановка номера наряда в уже отредактированный текст ответа. */
export function substituteOrderNumberPlaceholders(
  text: string,
  orderNumber: string,
): string {
  const num = orderNumber.trim();
  if (!num) return text;
  return text.replace(/\{\{orderNumber\}\}/g, num);
}

/** Реальный URL витрины вместо {{orderStatusUrl}} и preview-ссылки из префлайта. */
export function applyOrderStatusUrlToReplyContent(
  text: string,
  orderStatusUrl: string,
  samplePreviewUrl?: string,
): string {
  const url = orderStatusUrl.trim();
  if (!url) return text;
  let out = text.replace(/\{\{\s*orderStatusUrl\s*\}\}/g, url);
  const sample = samplePreviewUrl?.trim();
  if (sample && sample !== url) {
    out = out.split(sample).join(url);
  }
  return out;
}
