import fs from "node:fs/promises";
import path from "node:path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import JSZip from "jszip";
import { cleanLegalFullName } from "@/lib/document-workflow-markers";

/**
 * Карта модуля:
 * 1) Берём шаблон docx из data/templates/typical-contract-ooo.docx.
 * 2) Подставляем номер/дату и реквизиты клиники в XML документа.
 * 3) Для шага "редактор" генерируем простой docx из итогового текста.
 * 4) Номер загруженного договора извлекаем из текста document/header XML.
 */

const TEMPLATE_REL_PATH = "data/templates/typical-contract-ooo.docx";
const MONTHS_RU = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

export type ClinicContractSourceData = {
  name: string;
  legalFullName: string | null;
  legalAddress: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  bankName: string | null;
  bik: string | null;
  settlementAccount: string | null;
  correspondentAccount: string | null;
  ceoName: string | null;
  phone: string | null;
  phoneAccounting: string | null;
  phoneManagement: string | null;
  email: string | null;
};

export type ClinicContractDraftValues = {
  contractNumber: string;
  contractDate: string;
  orgShortName: string;
  inn: string;
  ceoName: string;
  email: string;
  requisitesLine: string;
};

export type ContractTemplateField = {
  key: string;
  label: string;
  value: string;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeText(s: string): string {
  try {
    return s.normalize("NFKC");
  } catch {
    return s;
  }
}

function orgShortName(c: ClinicContractSourceData): string {
  const raw = cleanLegalFullName(c.legalFullName) ?? "";
  if (!raw) return c.name.trim() || "—";
  let x = raw.replace(/^\s*ООО\s+/i, "").trim();
  if (x.startsWith("«") && x.endsWith("»")) {
    x = x.slice(1, -1).trim();
  }
  return x || c.name.trim() || "—";
}

function requisitesLine(c: ClinicContractSourceData): string {
  const parts = [
    `ИНН ${c.inn || "—"}`,
    c.kpp ? `КПП ${c.kpp}` : null,
    c.ogrn ? `ОГРН ${c.ogrn}` : null,
    c.legalAddress ? `Юр. адрес: ${c.legalAddress}` : null,
    c.settlementAccount && c.bankName
      ? `р/с ${c.settlementAccount} в ${c.bankName}`
      : null,
    c.correspondentAccount ? `к/с ${c.correspondentAccount}` : null,
    c.bik ? `БИК ${c.bik}` : null,
    c.phone?.trim() ? `тел. адм.: ${c.phone.trim()}` : null,
    c.phoneAccounting?.trim()
      ? `тел. бух.: ${c.phoneAccounting.trim()}`
      : null,
    c.phoneManagement?.trim()
      ? `тел. рук.: ${c.phoneManagement.trim()}`
      : null,
    c.email ? `e-mail: ${c.email}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function formatContractDateRu(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  return `«${day}» ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()} г.`;
}

export function formatYearMonthYYMM(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

export function formatContractNumber(yearMonth: string, sequence: number): string {
  return `${yearMonth}-${String(sequence).padStart(3, "0")}`;
}

export function parseGeneratedContractNumber(
  numberRaw: string,
): { yearMonth: string; sequence: number } | null {
  const s = normalizeText(numberRaw.trim());
  const m = /^(\d{4})-(\d{3})$/.exec(s);
  if (!m) return null;
  return { yearMonth: m[1], sequence: Number(m[2]) };
}

export function buildDraftValues(
  c: ClinicContractSourceData,
  contractNumber: string,
  date: Date,
): ClinicContractDraftValues {
  return {
    contractNumber,
    contractDate: formatContractDateRu(date),
    orgShortName: orgShortName(c),
    inn: c.inn?.trim() || "—",
    ceoName: c.ceoName?.trim() || "—",
    email: c.email?.trim() || "—",
    requisitesLine: requisitesLine(c),
  };
}

function applyNumberAndDate(
  xml: string,
  contractNumberValue: string,
  contractDateValue: string,
): string {
  let s = xml;
  s = s.replace(
    /<w:t>номер<\/w:t>/g,
    `<w:t>${escapeXml(contractNumberValue)}</w:t>`,
  );
  s = s.replace(
    /<w:t>дата<\/w:t>/g,
    `<w:t>${escapeXml(contractDateValue)}</w:t>`,
  );
  return s;
}

function replaceRedRequisitesOnly(xml: string, reqLineEscaped: string): string {
  return xml.replace(/<w:r[^>]*>([\s\S]*?)<\/w:r>/g, (full, inner) => {
    if (!inner.includes("<w:t>реквизиты</w:t>")) return full;
    if (!inner.includes('w:val="FF0000"')) return full;
    return full.replace(
      /<w:t>реквизиты<\/w:t>/,
      `<w:t>${reqLineEscaped}</w:t>`,
    );
  });
}

function applyTemplateBody(xml: string, v: ClinicContractDraftValues): string {
  let s = xml;
  s = applyNumberAndDate(s, v.contractNumber, v.contractDate);
  s = s.replace(
    /<w:t xml:space="preserve"> ИНН<\/w:t>/g,
    `<w:t xml:space="preserve"> ${escapeXml(v.inn)}</w:t>`,
  );
  s = s.replace(/<w:t>ООО<\/w:t>/g, `<w:t>${escapeXml(v.orgShortName)}</w:t>`);
  s = s.replace(
    /<w:t([^>]*)>ФИО<\/w:t>/g,
    `<w:t$1>${escapeXml(v.ceoName)}</w:t>`,
  );
  s = s.replace(/<w:t>почта<\/w:t>/g, `<w:t>${escapeXml(v.email)}</w:t>`);
  s = replaceRedRequisitesOnly(s, escapeXml(v.requisitesLine));
  return s;
}

function extractRedRuns(xml: string): string[] {
  const runs = [...xml.matchAll(/<w:r[^>]*>[\s\S]*?<\/w:r>/g)].map((m) => m[0]);
  return runs.filter((r) => r.includes('w:val="FF0000"'));
}

function normalizePlaceholderKey(label: string): string {
  return normalizeText(label)
    .toLowerCase()
    .replace(/[«»"“”„]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuotedParts(s: string): string[] {
  const out: string[] = [];
  const re = /[«"“”„]\s*([^»"“”„]+?)\s*[»"“”„]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const v = m[1].trim();
    if (v) out.push(v);
  }
  return out;
}

export async function extractContractTemplatePlaceholders(
  templateDocx: Buffer,
): Promise<string[]> {
  const zip = await JSZip.loadAsync(templateDocx);
  const files = Object.keys(zip.files).filter((name) =>
    /^word\/(document|header\d+)\.xml$/.test(name),
  );
  const uniq = new Map<string, string>();
  for (const name of files) {
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;
    for (const run of extractRedRuns(xml)) {
      const text = [...run.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((m) => decodeXmlEntities(m[1]))
        .join("");
      for (const quoted of extractQuotedParts(text)) {
        const key = normalizePlaceholderKey(quoted);
        if (!key || uniq.has(key)) continue;
        uniq.set(key, quoted);
      }
    }
  }
  return Array.from(uniq.values());
}

function suggestValueForPlaceholder(
  label: string,
  clinic: ClinicContractSourceData,
  contractNumber: string,
  contractDate: string,
  reqLine: string,
): string {
  const key = normalizePlaceholderKey(label);
  if (key.includes("номер") && key.includes("договор")) return contractNumber;
  if (key.includes("дата")) return contractDate;
  if (key.includes("инн")) return clinic.inn?.trim() || "";
  if (key.includes("кпп")) return clinic.kpp?.trim() || "";
  if (key.includes("огрн")) return clinic.ogrn?.trim() || "";
  if (key.includes("бик")) return clinic.bik?.trim() || "";
  if (key.includes("расчет") || key.includes("р/с")) {
    return clinic.settlementAccount?.trim() || "";
  }
  if (key.includes("корр") || key.includes("к/с")) {
    return clinic.correspondentAccount?.trim() || "";
  }
  if (key.includes("банк")) return clinic.bankName?.trim() || "";
  if (key.includes("адрес")) return clinic.legalAddress?.trim() || "";
  if (key.includes("почта") || key.includes("email") || key.includes("e-mail")) {
    return clinic.email?.trim() || "";
  }
  if (key.includes("фио") || key.includes("директор")) {
    return clinic.ceoName?.trim() || "";
  }
  if (key.includes("наимен")) return orgShortName(clinic);
  if (key.includes("реквизит")) return reqLine;
  return "";
}

export function buildContractTemplateFields(
  placeholders: string[],
  clinic: ClinicContractSourceData,
  contractNumber: string,
  date: Date,
): ContractTemplateField[] {
  const dateRu = formatContractDateRu(date);
  const reqLine = requisitesLine(clinic);
  const rows = placeholders.map((label) => ({
    key: normalizePlaceholderKey(label),
    label,
    value: suggestValueForPlaceholder(label, clinic, contractNumber, dateRu, reqLine),
  }));
  const hasContractNumberField = rows.some(
    (r) => r.key.includes("номер") && r.key.includes("договор"),
  );
  if (!hasContractNumberField) {
    rows.unshift({
      key: "__contract_number__",
      label: "Номер договора",
      value: contractNumber,
    });
  }
  return rows;
}

function applyPlaceholderMapToXml(
  xml: string,
  placeholderMap: Map<string, string>,
): string {
  if (placeholderMap.size === 0) return xml;
  return xml.replace(/<w:r[^>]*>[\s\S]*?<\/w:r>/g, (run) => {
    if (!run.includes('w:val="FF0000"')) return run;
    return run.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (_full, attrs, rawText) => {
      const decoded = decodeXmlEntities(rawText);
      const replaced = decoded.replace(
        /[«"“”„]\s*([^»"“”„]+?)\s*[»"“”„]/g,
        (quoted, inner) => {
          const key = normalizePlaceholderKey(inner);
          const next = placeholderMap.get(key);
          if (!next) return quoted;
          return next;
        },
      );
      if (replaced === decoded) return `<w:t${attrs}>${rawText}</w:t>`;
      return `<w:t${attrs}>${escapeXml(replaced)}</w:t>`;
    });
  });
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function xmlToPlainText(xml: string): string {
  let s = xml;
  s = s.replace(/<w:tab[^>]*\/>/g, "\t");
  s = s.replace(/<w:br[^>]*\/>/g, "\n");
  s = s.replace(/<\/w:p>/g, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeXmlEntities(s);
  s = s.replace(/\r\n?/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return normalizeText(s).trim();
}

let templateBufferPromise: Promise<Buffer> | null = null;
async function getTemplateBuffer(): Promise<Buffer> {
  if (!templateBufferPromise) {
    const abs = path.join(process.cwd(), TEMPLATE_REL_PATH);
    templateBufferPromise = fs.readFile(abs);
  }
  return Buffer.from(await templateBufferPromise);
}

export async function generateContractDocxFromTemplate(
  values: ClinicContractDraftValues,
): Promise<{ docx: Buffer; text: string }> {
  const tpl = await getTemplateBuffer();
  const zip = await JSZip.loadAsync(tpl);
  const docPath = "word/document.xml";
  const docXmlRaw = await zip.file(docPath)?.async("string");
  if (!docXmlRaw) throw new Error("Шаблон договора повреждён: нет word/document.xml");

  const docXml = applyTemplateBody(docXmlRaw, values);
  zip.file(docPath, docXml);

  for (const name of Object.keys(zip.files)) {
    if (!/^word\/header\d+\.xml$/.test(name)) continue;
    const raw = await zip.file(name)?.async("string");
    if (!raw) continue;
    if (!raw.includes("<w:t>номер</w:t>") && !raw.includes("<w:t>дата</w:t>")) {
      continue;
    }
    zip.file(name, applyNumberAndDate(raw, values.contractNumber, values.contractDate));
  }

  const docx = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return { docx, text: xmlToPlainText(docXml) };
}

export async function generateContractDocxFromTemplateFields(
  templateDocx: Buffer,
  fields: ContractTemplateField[],
  fallbackValues: ClinicContractDraftValues,
): Promise<Buffer> {
  const map = new Map<string, string>();
  for (const f of fields) {
    if (!f.key || f.key.startsWith("__")) continue;
    map.set(normalizePlaceholderKey(f.key), f.value ?? "");
    map.set(normalizePlaceholderKey(f.label), f.value ?? "");
  }
  const zip = await JSZip.loadAsync(templateDocx);
  const docPath = "word/document.xml";
  const docXmlRaw = await zip.file(docPath)?.async("string");
  if (!docXmlRaw) throw new Error("Шаблон договора повреждён: нет word/document.xml");
  let docXml = applyPlaceholderMapToXml(docXmlRaw, map);
  if (map.size === 0) {
    docXml = applyTemplateBody(docXmlRaw, fallbackValues);
  }
  zip.file(docPath, docXml);
  for (const name of Object.keys(zip.files)) {
    if (!/^word\/header\d+\.xml$/.test(name)) continue;
    const raw = await zip.file(name)?.async("string");
    if (!raw) continue;
    const next = applyPlaceholderMapToXml(raw, map);
    zip.file(name, next);
  }
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

export async function generateContractDocxFromPlainText(text: string): Promise<Buffer> {
  const rows = text.replace(/\r\n?/g, "\n").split("\n");
  const paragraphs = rows.map((line) => {
    if (!line.trim()) return new Paragraph("");
    return new Paragraph({ children: [new TextRun(line)] });
  });
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

/**
 * Извлечение номера из текста договора.
 * Не используем \b: в JS это ненадёжно для кириллицы, поэтому ищем явную конструкцию "Договор №".
 */
export function extractContractNumberFromDocumentText(text: string): string | null {
  const chunk = text.slice(0, 20000);
  const explicit = /договор[^\n\r№]{0,40}№\s*([A-Za-zА-Яа-я0-9./-]{2,40})/iu.exec(
    chunk,
  );
  if (explicit?.[1]) return explicit[1].trim();
  const generated = /(?:^|\s)(\d{4}-\d{3})(?=\s|$)/u.exec(chunk);
  if (generated?.[1]) return generated[1];
  return null;
}

export async function extractContractNumberFromDocxBuffer(
  data: Buffer,
): Promise<string | null> {
  const zip = await JSZip.loadAsync(data);
  const texts: string[] = [];

  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith("word/")) continue;
    if (!name.endsWith(".xml")) continue;
    if (!/^word\/(document|header\d+)\.xml$/.test(name)) continue;
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;
    texts.push(xmlToPlainText(xml));
  }

  return extractContractNumberFromDocumentText(texts.join("\n"));
}
