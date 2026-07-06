import "server-only";

import { isProbablyPdf } from "@/lib/invoice-number-extract";

/** Поля электронного наряда CLICK (v1.00 24-05) — одна схема формы, не позиции прайса. */
const CLICK_ORDER_FORM_MARKERS = [
  "Text2",
  "Text3",
  "Text4",
  "Date7_af_date",
  "Date8_af_date",
] as const;

const CLICK_ORDER_TEXT_LABELS: Record<string, string> = {
  Text2: "Клиника",
  Text3: "Ф.И.О. врача",
  Text4: "Ф.И.О. пациента",
  Text5: "Телефон врача",
  Text6: "Telegram",
  Date7_af_date: "Дата заказа",
  Date8_af_date: "Дата доставки в клинику",
  Text9: "Система имплантов",
  Text10: "Скан-маркер",
  Text11: "Комментарии",
  Text12: "Вид аппарата / работа",
  Text13: "Зубы ВЧ",
  Text14: "Зубы НЧ",
  Text15: "Протетика",
  Text16: "Цвет реставрации",
  Text17: "Цвет культи",
  Text18: "Ортодонтия — доп.",
  Text19: "Ортодонтия — доп.",
  Text20: "Ортодонтия — доп.",
  Text21: "Ортодонтия — доп.",
  Text22: "Ортодонтия — доп.",
  Text23: "Ортодонтия — доп.",
  Text24: "Ортопедия — доп.",
  Text25: "Ортопедия — доп.",
  Text26: "Ортопедия — доп.",
  Text27: "Ортопедия — доп.",
  Text28: "Ортопедия — доп.",
  Text29: "Ортопедия — доп.",
  Text30: "Ортопедия — доп.",
  Text31: "Ортопедия — доп.",
  Text32: "Ортопедия — доп.",
  Text33: "Ортопедия — доп.",
  Text34: "Ортопедия — доп.",
  Text35: "Ортопедия — доп.",
  Text36: "Ортопедия — доп.",
  Text37: "Ортопедия — доп.",
  Text38: "Ортопедия — доп.",
  Text39: "Ортопедия — доп.",
  Text40: "Ортопедия — доп.",
  Text43: "Ортопедия — доп.",
  "Цвет металла": "Цвет металла",
};

/** Первая строка «источник данных» на бланке (C2…). */
const CLICK_ORDER_SOURCE_CHECKBOX_LABELS: Record<string, string> = {
  C2: "Сканы",
  C6: "Слепки",
  C3: "КТ/КЛКТ",
  C7: "Диск КТ/КЛКТ",
  C4: "МРТ",
  C8: "Диск МРТ",
  C5: "Фото",
  C26: "Гипс. модели",
};

export type ClickOrderPdfExtract = {
  attachmentId?: string;
  fileName: string;
  clinicName: string | null;
  doctorName: string | null;
  patientName: string | null;
  doctorPhone: string | null;
  telegram: string | null;
  orderDateRaw: string | null;
  deliveryDateRaw: string | null;
  comments: string | null;
  workDescription: string | null;
  textFields: Record<string, string>;
  checkedSources: string[];
  promptBlock: string;
  clientOrderText: string;
};

function readPdfFieldValue(field: {
  getName: () => string;
  constructor: { name: string };
  getText?: () => string | undefined;
  isChecked?: () => boolean;
  getSelected?: () => string[] | string | undefined;
}): string {
  const type = field.constructor.name;
  try {
    if (type.includes("PDFTextField")) return (field.getText?.() ?? "").trim();
    if (type.includes("PDFCheckBox")) return field.isChecked?.() ? "1" : "";
    if (type.includes("PDFDropdown")) {
      const selected = field.getSelected?.();
      if (Array.isArray(selected)) return selected.join(", ").trim();
      return (selected ?? "").toString().trim();
    }
    if (type.includes("PDFRadioGroup")) {
      return (field.getSelected?.() ?? "").toString().trim();
    }
  } catch {
    return "";
  }
  return "";
}

export function isClickOrderPdfFormFieldNames(fieldNames: string[]): boolean {
  const set = new Set(fieldNames);
  return CLICK_ORDER_FORM_MARKERS.every((name) => set.has(name));
}

export function parsePatientNameFromOrderPdfFileName(fileName: string): string | null {
  const base = fileName.replace(/\.pdf$/iu, "").trim();
  if (!base) return null;
  if (/наряд|order|invoice|сч[её]т|scan|скан|payment|плат/i.test(base)) return null;
  if (!/^[\p{L}]+(?:\s+[\p{L}]+){1,3}$/u.test(base)) return null;
  return base;
}

export function buildClickOrderPdfPromptBlock(
  extract: Omit<ClickOrderPdfExtract, "promptBlock" | "clientOrderText">,
): { promptBlock: string; clientOrderText: string } {
  const lines: string[] = [`PDF наряд: ${extract.fileName}`];

  const push = (label: string, value: string | null | undefined) => {
    const v = value?.trim();
    if (v) lines.push(`${label}: ${v}`);
  };

  push("Клиника", extract.clinicName);
  push("Врач", extract.doctorName);
  push("Пациент", extract.patientName);
  push("Телефон", extract.doctorPhone);
  push("Telegram", extract.telegram);
  push("Дата заказа", extract.orderDateRaw);
  push("Дата доставки", extract.deliveryDateRaw);
  push("Комментарии", extract.comments);
  push("Работа / аппарат", extract.workDescription);

  for (const [field, value] of Object.entries(extract.textFields)) {
    const label = CLICK_ORDER_TEXT_LABELS[field] ?? field;
    if (["Text2", "Text3", "Text4", "Text5", "Text6", "Date7_af_date", "Date8_af_date", "Text11", "Text12"].includes(field)) {
      continue;
    }
    push(label, value);
  }

  if (extract.checkedSources.length > 0) {
    lines.push(`Источник данных: ${extract.checkedSources.join(", ")}`);
  }

  const clientOrderText = lines.slice(1).join("\n");
  return {
    promptBlock: lines.join("\n"),
    clientOrderText,
  };
}

export async function extractClickOrderPdfForm(
  buf: Buffer,
  mimeType: string,
  fileName: string,
  opts?: { attachmentId?: string },
): Promise<ClickOrderPdfExtract | null> {
  if (!isProbablyPdf(mimeType, fileName)) return null;
  if (buf.length < 32) return null;

  const PDF_PARSE_BUDGET_MS = 12_000;

  return Promise.race([
    (async () => {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const form = doc.getForm();
      const fields = form.getFields();
      const fieldNames = fields.map((f) => f.getName());
      if (!isClickOrderPdfFormFieldNames(fieldNames)) return null;

      const textFields: Record<string, string> = {};
      const checkedBoxes: string[] = [];

      for (const field of fields) {
        const name = field.getName();
        const value = readPdfFieldValue(field as never);
        if (field.constructor.name.includes("PDFCheckBox")) {
          if (value === "1") checkedBoxes.push(name);
          continue;
        }
        if (!value || value === ".") continue;
        textFields[name] = value;
      }

      const checkedSources = checkedBoxes
        .map((name) => CLICK_ORDER_SOURCE_CHECKBOX_LABELS[name] ?? name)
        .filter(Boolean);

      const patientFromFile = parsePatientNameFromOrderPdfFileName(fileName);
      const patientName = textFields.Text4?.trim() || patientFromFile;

      const partial: Omit<ClickOrderPdfExtract, "promptBlock" | "clientOrderText"> = {
        attachmentId: opts?.attachmentId,
        fileName,
        clinicName: textFields.Text2?.trim() || null,
        doctorName: textFields.Text3?.trim() || null,
        patientName,
        doctorPhone: textFields.Text5?.trim() || null,
        telegram: textFields.Text6?.trim() || null,
        orderDateRaw: textFields.Date7_af_date?.trim() || null,
        deliveryDateRaw: textFields.Date8_af_date?.trim() || null,
        comments: textFields.Text11?.trim() || null,
        workDescription: textFields.Text12?.trim() || null,
        textFields,
        checkedSources,
      };

      const hasContent =
        partial.patientName ||
        partial.clinicName ||
        partial.doctorName ||
        partial.workDescription ||
        partial.comments ||
        Object.keys(textFields).length > 2 ||
        checkedSources.length > 0;

      if (!hasContent) return null;

      const { promptBlock, clientOrderText } = buildClickOrderPdfPromptBlock(partial);
      return { ...partial, promptBlock, clientOrderText };
    })(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), PDF_PARSE_BUDGET_MS)),
  ]);
}
