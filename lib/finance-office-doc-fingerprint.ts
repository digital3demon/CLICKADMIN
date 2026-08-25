/**
 * Отпечаток счёта/УПД для привязки: ИНН покупателя + дата + сумма + артикулы.
 * Номер УПД с номером счёта не сравниваем.
 * Дата — из шапки («Счёт на оплату / Счёт-фактура / Документ об отгрузке»),
 * не из договора и не из «к платежно-расчетному документу».
 */

import {
  extractLinesFromRuInvoiceTable,
  extractTotalRub,
  parseIntRu,
} from "@/lib/parse-invoice-extracted-text";
import {
  extractYmdAfterOtFromNormalizedText,
  type InvoiceYmd,
} from "@/lib/format-invoice-number-ru";

export type DocFingerprint = {
  buyerInn: string | null;
  ymd: string | null;
  totalRub: number | null;
  codes: string[];
};

export function ymdKey(ymd: InvoiceYmd): string {
  const mm = String(ymd.m0 + 1).padStart(2, "0");
  const dd = String(ymd.d).padStart(2, "0");
  return `${ymd.y}-${mm}-${dd}`;
}

/** ИНН покупателя; продавец (после «продавца» / «получатель») отбрасывается. */
export function extractBuyerInn(text: string): string | null {
  const raw = String(text || "").replace(/\u00a0/g, " ");
  const buyerKpp = /инн\s*\/\s*кпп\s+покупателя:\s*(\d{10})/iu.exec(raw);
  if (buyerKpp?.[1]) return buyerKpp[1];

  const sellerKpp = /инн\s*\/\s*кпп\s+продавца:\s*(\d{10})/iu.exec(raw)?.[1] ?? null;
  const idx = raw.search(/покупатель/iu);
  const slice = idx >= 0 ? raw.slice(idx, idx + 900) : raw;
  const inns = [...slice.matchAll(/инн\s*:?\s*(\d{10})/giu)].map((m) => m[1]!);
  const unique = inns.filter((inn, i) => inns.indexOf(inn) === i);
  const notSeller = unique.filter((inn) => inn !== sellerKpp);
  if (notSeller[0]) return notSeller[0];
  if (unique[0] && unique[0] !== sellerKpp) return unique[0];
  return notSeller[0] ?? unique[0] ?? null;
}

/** Артикул прайса «-7209»; без `\b`. Не берём номер счёта/УПД (без минуса). */
const DASHED_PRICE_CODE_RE = /(?<![0-9])(-\d{4,5})(?![0-9])/gu;

export function extractPriceCodesFromDocText(text: string): string[] {
  const fromTable = extractLinesFromRuInvoiceTable(text)
    .map((l) => (l.code || "").trim())
    .filter((c) => /^-\d{4,5}$/.test(c));
  const loose: string[] = [];
  DASHED_PRICE_CODE_RE.lastIndex = 0;
  for (const m of text.matchAll(DASHED_PRICE_CODE_RE)) {
    loose.push(m[1] ?? "");
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [...fromTable, ...loose]) {
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out.slice(0, 24);
}

function ymdKeyFromOtChunk(chunk: string): string | null {
  const ymd = extractYmdAfterOtFromNormalizedText(
    String(chunk || "")
      .replace(/\u00a0/g, " ")
      .replace(/_/g, " "),
  );
  return ymd ? ymdKey(ymd) : null;
}

/**
 * Дата самого документа, не первое «от» в PDF.
 * Иначе счёт 1645 берёт «Договор … от 20.08.2024», УПД 1656 — «платёжка № 811 от 11.08.2026».
 */
export function extractDocYmdKey(text: string, fileName?: string): string | null {
  const raw = String(text || "").replace(/\u00a0/g, " ");
  const anchors: RegExp[] = [
    /сч[её]т\s+на\s+оплату[\s\S]{0,120}?(?=от\s+\d)/iu,
    /сч[её]т[-\s]?фактур\w*[\s\S]{0,120}?(?=от\s+\d)/iu,
    /документ\s+об\s+отгрузке[\s\S]{0,200}?(?=от\s+\d)/iu,
  ];
  for (const re of anchors) {
    re.lastIndex = 0;
    const m = re.exec(raw);
    if (!m) continue;
    const slice = raw.slice(m.index, m.index + m[0].length + 72);
    const key = ymdKeyFromOtChunk(slice);
    if (key) return key;
  }
  if (fileName) {
    const fromName = ymdKeyFromOtChunk(fileName);
    if (fromName) return fromName;
  }
  const stripped = raw
    .replace(/договор[^\n]{0,120}/giu, " ")
    .replace(/платежно[\s-]*расчетн[^\n]{0,120}/giu, " ")
    .replace(/постановлени[^\n]{0,220}/giu, " ");
  return ymdKeyFromOtChunk(stripped.slice(0, 12000));
}

/**
 * Счёт: одно «Всего к оплате: 5 000».
 * УПД: «Всего к оплате … нетто … НДС … сумма с налогом» — берём последнее.
 */
export function extractFingerprintTotalRub(text: string): number | null {
  const line = /всего\s+к\s+оплате[^\n]{0,220}/iu.exec(String(text || ""));
  if (line?.[0]) {
    const moneys = [...line[0].matchAll(/(\d[\d\s\u00A0]*(?:[.,]\d{1,2})?)/g)]
      .map((m) => parseIntRu(m[1] ?? ""))
      .filter((n): n is number => n != null && n > 0);
    if (moneys.length >= 2) return moneys[moneys.length - 1]!;
    if (moneys.length === 1) return moneys[0]!;
  }
  return extractTotalRub(text);
}

export function buildDocFingerprint(text: string, fileName?: string): DocFingerprint {
  const codes = extractPriceCodesFromDocText(text);
  return {
    buyerInn: extractBuyerInn(text),
    ymd: extractDocYmdKey(text, fileName),
    totalRub: extractFingerprintTotalRub(text),
    codes,
  };
}

export function fingerprintsMatch(a: DocFingerprint, b: DocFingerprint): boolean {
  if (!a.buyerInn || !b.buyerInn || a.buyerInn !== b.buyerInn) return false;
  if (a.totalRub == null || b.totalRub == null || a.totalRub !== b.totalRub) {
    return false;
  }
  if (!a.ymd || !b.ymd || a.ymd !== b.ymd) return false;
  if (a.codes.length > 0 && b.codes.length > 0) {
    const sa = [...a.codes].sort().join("\0");
    const sb = [...b.codes].sort().join("\0");
    return sa === sb;
  }
  return true;
}

export function fingerprintFromStoredInvoice(opts: {
  buyerInn: string | null;
  totalRub: number | null;
  invoiceNumber: string | null;
  codes: string[];
}): DocFingerprint {
  const ymd = extractDocYmdKey(`от ${String(opts.invoiceNumber || "")}`);
  return {
    buyerInn: opts.buyerInn,
    ymd,
    totalRub: opts.totalRub,
    codes: opts.codes.filter(Boolean),
  };
}
