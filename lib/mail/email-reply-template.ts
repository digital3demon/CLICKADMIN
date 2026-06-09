export type EmailReplyTemplateContext = {
  orderNumber: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  dueDate: string;
  appointmentDate: string;
  originalSubject: string;
  originalFrom: string;
};

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

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
