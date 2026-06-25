import type { EmailReplyTemplateContext } from "@/lib/mail/email-reply-template";

function formatMailDateTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  originalSubject?: string | null;
  originalFromName?: string | null;
  originalFromAddress?: string | null;
};

export function buildEmailReplyTemplateContext(
  input: BuildEmailReplyContextInput,
): EmailReplyTemplateContext {
  return {
    orderNumber: input.orderNumber.trim() || "…",
    patientName: input.patientName?.trim() || "—",
    doctorName: input.doctorName?.trim() || "—",
    clinicName: input.clinicName?.trim() || "Частное лицо",
    clinicAddress: input.clinicAddress?.trim() || "—",
    dueDate: formatMailDateTime(input.dueDate),
    appointmentDate: formatMailDateTime(input.appointmentDate),
    originalSubject: input.originalSubject?.trim() || "",
    originalFrom: senderLabel(input.originalFromName, input.originalFromAddress),
  };
}
