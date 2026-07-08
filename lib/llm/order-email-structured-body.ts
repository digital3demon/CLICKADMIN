import { parsePatientNameFromEmailBody } from "./order-email-subject-parse";

const LABELED_LINE_RE =
  /^(?:Врач|Пациент|Клиника|Заказчик|Организация|От|Дата|Письмо|Тема|Fwd|Re)\s*:/iu;

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
  const doctorHint = parseLabeledLine(body, "Врач");
  const clinicHint =
    parseLabeledLine(body, "Клиника") ||
    parseLabeledLine(body, "Заказчик") ||
    parseLabeledLine(body, "Организация");

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
