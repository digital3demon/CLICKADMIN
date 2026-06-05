/**
 * PDF-шаблон договора (AcroForm): извлечение полей и заполнение без flatten.
 */
import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import type { ClinicContractSourceData } from "@/lib/clinic-contract";
import {
  buildDraftValues,
  extractContractNumberFromDocumentText,
} from "@/lib/clinic-contract";
import { CONTRACT_FIELD_REGISTRY } from "@/lib/contract-field-registry";
import type { ContractTemplateField } from "@/lib/clinic-contract";

export const CONTRACT_PDF_TEMPLATE_REL = "data/templates/typical-contract-ooo.pdf";

export type FillContractPdfOptions = {
  flatten?: boolean;
};

function normalizeFieldKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

export async function extractContractPdfFormFields(
  pdfBuffer: Buffer,
): Promise<string[]> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const form = doc.getForm();
  const names = new Set<string>();
  for (const field of form.getFields()) {
    const n = field.getName()?.trim();
    if (n) names.add(n);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "ru"));
}

function fieldValuesFromTemplateFields(
  fields: ContractTemplateField[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of fields) {
    if (!f.key || f.key.startsWith("__")) continue;
    const v = f.value ?? "";
    map.set(normalizeFieldKey(f.key), v);
    map.set(normalizeFieldKey(f.label), v);
    for (const def of CONTRACT_FIELD_REGISTRY) {
      if (
        normalizeFieldKey(f.key).includes(def.key) ||
        normalizeFieldKey(f.label).includes(normalizeFieldKey(def.label))
      ) {
        map.set(def.pdfField, v);
      }
    }
  }
  for (const f of fields) {
    if (f.key === "__contract_number__" && f.value) {
      map.set("contract_number", f.value);
    }
  }
  return map;
}

export function suggestPdfFieldValues(
  clinic: ClinicContractSourceData,
  contractNumber: string,
  date: Date,
): Map<string, string> {
  const draft = buildDraftValues(clinic, contractNumber, date);
  const map = new Map<string, string>();
  map.set("contract_number", contractNumber);
  map.set("contract_place", "г. Санкт-Петербург");
  map.set("contract_date", draft.contractDate);
  map.set("client_name", draft.orgShortName);
  map.set("client_inn", clinic.inn?.trim() || "—");
  map.set("client_kpp", clinic.kpp?.trim() || "");
  map.set("client_ogrn", clinic.ogrn?.trim() || "");
  map.set("client_ceo", draft.ceoName);
  map.set("client_email", draft.email);
  map.set("client_address", clinic.legalAddress?.trim() || "");
  map.set("client_requisites", draft.requisitesLine);
  return map;
}

export async function fillContractPdfFromFields(
  templatePdf: Buffer,
  fields: ContractTemplateField[],
  clinic: ClinicContractSourceData,
  contractNumber: string,
  date: Date,
  options: FillContractPdfOptions = {},
): Promise<Buffer> {
  const map = fieldValuesFromTemplateFields(fields);
  const defaults = suggestPdfFieldValues(clinic, contractNumber, date);
  for (const [k, v] of defaults) {
    if (!map.has(k) || !map.get(k)?.trim()) map.set(k, v);
  }
  return fillContractPdfFromMap(templatePdf, map, options);
}

export async function fillContractPdfFromMap(
  templatePdf: Buffer,
  values: Map<string, string>,
  options: FillContractPdfOptions = {},
): Promise<Buffer> {
  const doc = await PDFDocument.load(templatePdf, { ignoreEncryption: true });
  doc.registerFontkit(fontkit);
  const form = doc.getForm();

  let appearanceFont: PDFFont | null = null;
  try {
    const fonts = await embedNotoFonts(doc);
    appearanceFont = fonts.regular;
  } catch {
    /* шрифты data/fonts — при отсутствии остаётся дефолт appearance шаблона */
  }

  for (const field of form.getFields()) {
    const name = field.getName();
    if (!name) continue;
    const key = normalizeFieldKey(name);
    const value = values.get(key) ?? values.get(name) ?? "";
    try {
      const textField = form.getTextField(name);
      textField.setText(value);
      continue;
    } catch {
      /* not a text field */
    }
  }

  if (appearanceFont) {
    try {
      form.updateFieldAppearances(appearanceFont);
    } catch {
      /* */
    }
  }

  if (options.flatten) {
    form.flatten();
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function extractContractNumberFromPdfBuffer(
  data: Buffer,
): Promise<string | null> {
  const doc = await PDFDocument.load(data, { ignoreEncryption: true });
  const form = doc.getForm();
  try {
    const n = form.getTextField("contract_number")?.getText()?.trim();
    if (n) return n;
  } catch {
    /* */
  }
  const texts: string[] = [];
  for (const page of doc.getPages()) {
    // pdf-lib doesn't expose text extraction — use field only
    void page;
  }
  return extractContractNumberFromDocumentText(texts.join("\n"));
}

let templatePdfPromise: Promise<Buffer> | null = null;

export async function getContractPdfTemplateBuffer(): Promise<Buffer> {
  if (!templatePdfPromise) {
    const abs = path.join(process.cwd(), CONTRACT_PDF_TEMPLATE_REL);
    templatePdfPromise = fs.readFile(abs);
  }
  return Buffer.from(await templatePdfPromise);
}

export async function buildContractPlaceholderListFromPdf(
  pdfBuffer: Buffer,
): Promise<string[]> {
  const fields = await extractContractPdfFormFields(pdfBuffer);
  return fields.map((name) => {
    const def = CONTRACT_FIELD_REGISTRY.find((d) => d.pdfField === name);
    return def?.label ?? name;
  });
}

/** Экспорт для build-скрипта: пути к шрифтам Noto. */
export function resolveNotoFontPaths(): { regular: string; bold: string } {
  const base = path.join(process.cwd(), "data", "fonts");
  return {
    regular: path.join(base, "NotoSans-Regular.ttf"),
    bold: path.join(base, "NotoSans-Bold.ttf"),
  };
}

export type BuildPdfFonts = { regular: PDFFont; bold: PDFFont };

export async function embedNotoFonts(doc: PDFDocument): Promise<BuildPdfFonts> {
  doc.registerFontkit(fontkit);
  const { regular: regPath, bold: boldPath } = resolveNotoFontPaths();
  const regularBytes = await fs.readFile(regPath);
  const boldBytes = await fs.readFile(boldPath);
  const regular = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  return { regular, bold };
}

export const CONTRACT_PDF_ACCENT = rgb(37 / 255, 99 / 255, 235 / 255);
export const CONTRACT_PDF_TEXT = rgb(17 / 255, 24 / 255, 39 / 255);
export const CONTRACT_PDF_MUTED = rgb(107 / 255, 114 / 255, 128 / 255);
export const CONTRACT_PDF_BORDER = rgb(229 / 255, 231 / 255, 235 / 255);
