import type { EmailReplyTemplateContext } from "@/lib/mail/email-reply-template";

function parseContextDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const t = String(value).trim();
  if (!t) return null;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (ymd) {
    const d2 = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0, 0);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }
  return null;
}

function formatMailDateTime(value: Date | string | null | undefined): string {
  const d = parseContextDate(value);
  if (!d) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMailDate(value: Date | string | null | undefined): string {
  const d = parseContextDate(value);
  if (!d) return "";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** YYYY-MM-DD из datetime-local или date input. */
export function localInputToDateYmd(value: string | null | undefined): string {
  const t = String(value ?? "").trim();
  if (!t) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(t);
  return m?.[1] ?? "";
}

function senderLabel(
  fromName: string | null | undefined,
  fromAddress: string | null | undefined,
): string {
  const name = fromName?.trim();
  const addr = fromAddress?.trim();
  if (name && addr) return `${name} <${addr}>`;
  return name || addr || "";
}

export type BuildEmailReplyContextInput = {
  orderNumber: string;
  patientName?: string | null;
  doctorName?: string | null;
  clinicName?: string | null;
  clinicAddress?: string | null;
  dueDate?: Date | string | null;
  appointmentDate?: Date | string | null;
  /** Дата для {{date}}; если не задана — из dueDate, иначе appointmentDate. */
  date?: Date | string | null;
  originalSubject?: string | null;
  originalFromName?: string | null;
  originalFromAddress?: string | null;
};

export function buildEmailReplyTemplateContext(
  input: BuildEmailReplyContextInput,
): EmailReplyTemplateContext {
  const dateSource =
    input.date ??
    input.dueDate ??
    input.appointmentDate;
  return {
    orderNumber: input.orderNumber.trim() || "…",
    patientName: input.patientName?.trim() || "—",
    doctorName: input.doctorName?.trim() || "—",
    clinicName: input.clinicName?.trim() || "Частное лицо",
    clinicAddress: input.clinicAddress?.trim() || "—",
    date: formatMailDate(dateSource),
    dueDate: formatMailDateTime(input.dueDate),
    appointmentDate: formatMailDateTime(input.appointmentDate),
    originalSubject: input.originalSubject?.trim() || "",
    originalFrom: senderLabel(input.originalFromName, input.originalFromAddress),
  };
}
