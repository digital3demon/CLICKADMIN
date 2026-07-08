import { parsePatientNameFromEmailBody } from "./order-email-subject-parse";

const LABELED_LINE_RE =
  /^(?:Врач|Доктор|Пациент|Клиника|Заказчик|Организация|От|Дата|Письмо|Тема|Fwd|Re)\s*:/iu;

const DOCTOR_LABELS = ["Врач", "Доктор"] as const;
const CLINIC_LABELS = ["Клиника", "Заказчик", "Организация"] as const;

export type StructuredEmailBodyParse = {
  patientName: string | null;
  doctorHint: string | null;
  clinicHint: string | null;
  clientOrderText: string | null;
  /** Достаточно полей, чтобы обойти LLM-extract. */
  isStructured: boolean;
};

function parseLabeledLine(text: string, label: string): string | null {
  const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`, "iu");
  const raw = text.match(re)?.[1]?.trim();
  return raw && raw.length > 1 ? raw : null;
}

function parseFirstLabeledLine(text: string, labels: readonly string[]): string | null {
  for (const label of labels) {
    const hit = parseLabeledLine(text, label);
    if (hit) return hit;
  }
  return null;
}

/** Первая строка без метки — часто название клиники («Atribeante СПб …»). */
function inferClinicHintFromLeadingLine(text: string): string | null {
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (LABELED_LINE_RE.test(trimmed)) return null;
    return trimmed.length >= 3 ? trimmed : null;
  }
  return null;
}

/** Письма вида «Врач: … / Пациент: … / описание работы» — без LLM. */
export function parseStructuredClinicEmailBody(
  text: string | null | undefined,
): StructuredEmailBodyParse {
  const body = text?.trim() ?? "";
  if (!body) {
    return {
      patientName: null,
      doctorHint: null,
      clinicHint: null,
      clientOrderText: null,
      isStructured: false,
    };
  }

  const patientName = parsePatientNameFromEmailBody(body);
  const doctorHint = parseFirstLabeledLine(body, DOCTOR_LABELS);
  const clinicHint =
    parseFirstLabeledLine(body, CLINIC_LABELS) || inferClinicHintFromLeadingLine(body);

  const workLines: string[] = [];
  for (const line of body.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || LABELED_LINE_RE.test(trimmed)) continue;
    workLines.push(trimmed);
  }
  const clientOrderText = workLines.join("\n").trim() || null;

  const isStructured = Boolean(
    patientName &&
      clientOrderText &&
      clientOrderText.length >= 8 &&
      (doctorHint || clinicHint),
  );

  return { patientName, doctorHint, clinicHint, clientOrderText, isStructured };
}
