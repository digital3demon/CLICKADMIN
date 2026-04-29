import {
  extractInvoiceNumberFromDocumentText,
  extractInvoiceNumberFromFileName,
} from "@/lib/invoice-number-extract";
import {
  formatInvoiceParsedLinesAsText,
  type InvoiceParsedLineV1,
} from "@/lib/invoice-parsed-types";

export type ParseInvoicePdfResult = {
  lines: InvoiceParsedLineV1[];
  totalRub: number | null;
  summaryText: string;
  warnings: string[];
  /** Номер из заголовка счёта / имени файла — подставляется в наряд, если поле пустое. */
  suggestedInvoiceNumber: string | null;
};

const NBSP = /\u00A0/g;

function stripMoney(s: string): string {
  return s.replace(/\s/g, "").replace(NBSP, "").replace(/,/g, ".");
}

/** Целые рубли из суммы вида «22 500,00» или «22500». */
export function parseIntRu(s: string): number | null {
  const t = stripMoney(s);
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

const MONEY_TOKEN = String.raw`\d[\d\s\u00A0]*(?:[.,]\d{1,2})?`;

/**
 * Типовая строка таблицы: артикул, наименование, кол-во, ед., цена, сумма.
 * Пример: «1 -1001 Сплинт сложный 1 шт 18 095,24 18 095,24»
 */
/** Опционально № строки таблицы: «1. », «1) » или «1 » перед артикулом «-1001». */
const RE_TABLE_ROW = new RegExp(
  String.raw`^\s*(?:\d+(?:[.)]\s+|\s+))?(-?\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(?:шт|ед\.?|усл\.?)\s+(${MONEY_TOKEN})\s+(${MONEY_TOKEN})\s*$`,
  "iu",
);

/** Хвост «кол-во ед. цена сумма» в конце строки (гибче к пробелам в суммах). */
const RE_ROW_TAIL = new RegExp(
  String.raw`\s+(\d+(?:[.,]\d+)?)\s+(?:шт|ед\.?|усл\.?)\s+(${MONEY_TOKEN})\s+(${MONEY_TOKEN})\s*$`,
  "iu",
);

/** Следующая строка — только «1 шт … …» (PDF разорвал после наименования). */
const RE_LINE_QTY_UNIT_MONEY =
  /^\s*\d+(?:[.,]\d+)?\s+(?:шт|ед\.?|усл\.?)\s+\d[\d\s\u00A0]*(?:[.,]\d{1,2})?\s+\d[\d\s\u00A0]*(?:[.,]\d{1,2})?\s*$/iu;

/** Следующая строка — только две суммы (после «… 1 шт»). */
const RE_LINE_TWO_MONEY =
  /^\s*\d[\d\s\u00A0]*(?:[.,]\d{1,2})?\s+\d[\d\s\u00A0]*(?:[.,]\d{1,2})?\s*$/u;

function normalizeExtractedInvoiceText(text: string): string {
  let t = text.replace(/\r\n?/g, "\n");
  t = t.replace(/[\u2212\u2013\u2014]/g, "-");
  t = t.replace(/\t/g, " ");
  t = t.replace(/[ \u00A0]{2,}/g, " ");
  return t;
}

/**
 * PDF часто рвёт строку: «1 -1001 Сплинт сложный» + «1 шт 18 095,24 18 095,24»
 * или «… 1 шт» + «18 095,24 18 095,24».
 */
function mergeBrokenInvoiceTableLines(rawLines: string[]): string[] {
  const merged: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    let cur = rawLines[i]!;
    const next = rawLines[i + 1];
    if (next != null) {
      const tail = next.trim();
      const curHasSht = /\bшт\b/i.test(cur);
      if (
        !curHasSht &&
        /^(?:\d+[.)]\s+|\d+\s+)?-?\d+\s+\S/u.test(cur) &&
        RE_LINE_QTY_UNIT_MONEY.test(tail)
      ) {
        cur = `${cur} ${tail}`.replace(/\s{2,}/g, " ");
        i++;
      } else if (
        /\d+(?:[.,]\d+)?\s+шт\b/i.test(cur) &&
        !RE_TABLE_ROW.test(cur) &&
        RE_LINE_TWO_MONEY.test(tail)
      ) {
        cur = `${cur} ${tail}`.replace(/\s{2,}/g, " ");
        i++;
      }
    }
    merged.push(cur);
  }
  return merged;
}

function parseOneTableLine(line: string): InvoiceParsedLineV1 | null {
  const m1 = line.match(RE_TABLE_ROW);
  if (m1) {
    const codeRaw = (m1[1] ?? "").trim();
    let name = (m1[2] ?? "").trim().replace(/\s{2,}/g, " ");
    const qty = Number.parseFloat(String(m1[3]).replace(",", "."));
    const lineTotalRub = parseIntRu(m1[5] ?? "");
    if (!Number.isFinite(qty) || qty <= 0 || qty > 99_999) return null;
    if (name.length < 2) return null;
    if (lineTotalRub == null || lineTotalRub < 0) return null;
    const code =
      /^-?\d+$/.test(codeRaw) && codeRaw.replace(/^-/, "").length >= 2
        ? codeRaw
        : null;
    if (!code) {
      name = `${codeRaw} ${name}`.trim();
    }
    return { name, qty, code: code ?? null, lineTotalRub };
  }

  const tail = line.match(RE_ROW_TAIL);
  if (tail && tail.index != null && tail.index > 2) {
    const head = line.slice(0, tail.index).trim();
    const qty = Number.parseFloat(String(tail[1]).replace(",", "."));
    const lineTotalRub = parseIntRu(tail[3] ?? "");
    if (!Number.isFinite(qty) || qty <= 0 || qty > 99_999) return null;
    if (lineTotalRub == null || lineTotalRub < 0) return null;
    const headCode = /^(?:\d+(?:[.)]\s+|\s+))?(-?\d+)\s+(.+)$/iu.exec(head);
    if (headCode) {
      const codeRaw = (headCode[1] ?? "").trim();
      let name = (headCode[2] ?? "").trim().replace(/\s{2,}/g, " ");
      const code =
        /^-?\d+$/.test(codeRaw) && codeRaw.replace(/^-/, "").length >= 2
          ? codeRaw
          : null;
      if (!code) {
        name = `${codeRaw} ${name}`.trim();
      }
      if (name.length < 2) return null;
      return { name, qty, code: code ?? null, lineTotalRub };
    }
  }

  return null;
}

function isTableHeaderLine(line: string): boolean {
  const t = line.slice(0, 80).toLowerCase();
  if (/товар|наименование|работ.*услуг/i.test(t) && /кол|ед\.|цена|сумма/i.test(t))
    return true;
  if (/^№\s*товар/i.test(t)) return true;
  return false;
}

function shouldSkipContextLine(line: string): boolean {
  const low = line.toLowerCase();
  if (/страниц|стр\.\s*\d|поставщик|покупатель|исполнитель|заказчик/i.test(low))
    return true;
  if (/\bинн\b|\bкпп\b|р\/с|корр\.?\s*сч|бик|банк/i.test(low)) return true;
  if (/сч[её]т\s+на\s+оплату/i.test(low)) return true;
  if (/основание|договор/i.test(low) && /№/i.test(line)) return true;
  return false;
}

/** Позиции из потока символов между заголовком таблицы и итогами (PDF «слепил» строки). */
function extractLinesFromTableBlob(text: string): InvoiceParsedLineV1[] {
  const normalized = normalizeExtractedInvoiceText(text);
  const lower = normalized.toLowerCase();
  let start = -1;
  const headerRes = [
    /работ[^.\n]{0,60}услуг[^.\n]{0,40}кол/i,
    /наименован[^.\n]{0,40}кол/i,
    /товар[^.\n]{0,60}кол/i,
  ];
  for (const re of headerRes) {
    const m = re.exec(lower);
    if (m && (start < 0 || m.index < start)) start = m.index;
  }
  if (start < 0) return [];
  let tail = normalized.slice(start);
  const endM = /\n\s*(?:итого\b|всего\s+к\s+оплате|сумма\s+ндс)/iu.exec(tail);
  if (endM && endM.index > 0) tail = tail.slice(0, endM.index);
  const blob = tail.replace(/\s+/g, " ").trim();
  if (blob.length < 24) return [];

  const out: InvoiceParsedLineV1[] = [];
  const seen = new Set<string>();
  const reAny = new RegExp(
    String.raw`(?:^|\s)(?:\d+(?:[.)]\s+|\s+))?(-?\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(?:шт|ед\.?|усл\.?)\s+(${MONEY_TOKEN})\s+(${MONEY_TOKEN})`,
    "giu",
  );
  let m: RegExpExecArray | null;
  while ((m = reAny.exec(blob)) != null) {
    const codeRaw = (m[1] ?? "").trim();
    let name = (m[2] ?? "").trim().replace(/\s{2,}/g, " ");
    const qty = Number.parseFloat(String(m[3]).replace(",", "."));
    const lineTotalRub = parseIntRu(m[5] ?? "");
    if (!Number.isFinite(qty) || qty <= 0 || qty > 99_999) continue;
    if (name.length < 2) continue;
    if (lineTotalRub == null || lineTotalRub < 0) continue;
    if (/^(кол|ед|цена|сумма|ндс|итого|всего|товар)/iu.test(name)) continue;
    const code =
      /^-?\d+$/.test(codeRaw) && codeRaw.replace(/^-/, "").length >= 2
        ? codeRaw
        : null;
    if (!code) {
      name = `${codeRaw} ${name}`.trim();
    }
    const key = `${code ?? ""}|${name}|${qty}|${lineTotalRub}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, qty, code: code ?? null, lineTotalRub });
  }
  return out;
}

/** Строки таблицы позиций (РФ; разрывы строк + «поток» PDF). */
export function extractLinesFromRuInvoiceTable(
  text: string,
): InvoiceParsedLineV1[] {
  const normalized = normalizeExtractedInvoiceText(text);
  const rawLines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  const merged = mergeBrokenInvoiceTableLines(rawLines);
  const out: InvoiceParsedLineV1[] = [];
  const seen = new Set<string>();
  const addRow = (row: InvoiceParsedLineV1) => {
    const key = `${row.code ?? ""}|${row.name}|${row.qty}|${row.lineTotalRub}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };

  for (const line of merged) {
    if (line.length < 8 || line.length > 500) continue;
    if (isTableHeaderLine(line) || shouldSkipContextLine(line)) continue;
    const row = parseOneTableLine(line);
    if (row) addRow(row);
  }
  for (const row of extractLinesFromTableBlob(text)) {
    addRow(row);
  }
  return out;
}

/**
 * Грубый разбор: строка заканчивается количеством и «шт» (если таблица
 * разбилась иначе в PDF).
 */
function extractLinesHeuristic(text: string): InvoiceParsedLineV1[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: InvoiceParsedLineV1[] = [];
  const qtyEnd = /(\d+(?:[.,]\d+)?)\s*(?:шт\.?|ед\.?)?\s*$/i;

  for (const line of lines) {
    if (line.length < 6 || line.length > 400) continue;
    const low = line.toLowerCase();
    if (
      /^(товар|наименование|работ|услуг|кол|сумма|ндс|итого|всего)/i.test(
        line.slice(0, 24),
      )
    ) {
      continue;
    }
    if (/страниц|стр\.\s*\d|сч[её]т\s*№/i.test(low)) continue;
    if (RE_TABLE_ROW.test(line)) continue;
    const m = line.match(qtyEnd);
    if (!m) continue;
    const qty = Number.parseFloat(m[1].replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0 || qty > 9999) continue;
    let name = line.slice(0, m.index).trim();
    name = name.replace(/^[\d.\s\-–—]+/, "").trim();
    if (name.length < 3) continue;
    out.push({ name, qty });
  }
  return out.slice(0, 80);
}

/** Итог «Всего к оплате» / «на сумму … руб.» — без ложных срабатываний на «Итого» до НДС. */
export function extractTotalRub(text: string): number | null {
  const normalized = text.replace(/\r/g, "\n");
  const money = String.raw`(\d[\d\s\u00A0]*(?:[.,]\d{1,2})?)`;

  const primary: RegExp[] = [
    new RegExp(
      String.raw`всего\s+к\s+оплате[^\d]{0,80}?${money}`,
      "giu",
    ),
    new RegExp(
      String.raw`итого\s+к\s+оплате[^\d]{0,80}?${money}`,
      "giu",
    ),
  ];
  for (const re of primary) {
    re.lastIndex = 0;
    let last: number | null = null;
    let m: RegExpExecArray | null;
    while ((m = re.exec(normalized)) != null) {
      const v = parseIntRu(m[1] ?? "");
      if (v != null && v > 0) last = v;
    }
    if (last != null) return last;
  }

  const vsegoNaim = normalized.match(
    /всего\s+наименований[^.\n\r]{0,160}/giu,
  );
  if (vsegoNaim) {
    for (const block of vsegoNaim) {
      const sm = block.match(
        /на\s+сумму\s+(\d[\d\s\u00A0]*(?:[.,]\d{1,2})?)/iu,
      );
      if (sm?.[1]) {
        const v = parseIntRu(sm[1]);
        if (v != null && v > 0) return v;
      }
    }
  }

  const naSummu = /на\s+сумму\s+(\d[\d\s\u00A0]*(?:[.,]\d{1,2})?)\s*(?:руб|₽)/giu;
  let best: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = naSummu.exec(normalized)) != null) {
    const v = parseIntRu(m[1] ?? "");
    if (v != null && v > 0) {
      if (best == null || v > best) best = v;
    }
  }
  if (best != null) return best;

  const weak = new RegExp(
    String.raw`(?:^|\n)\s*итого(?!\s+наименований)[^\d\n]{0,30}${money}\s*(?:руб|₽)`,
    "giu",
  );
  weak.lastIndex = 0;
  let lastWeak: number | null = null;
  while ((m = weak.exec(normalized)) != null) {
    const v = parseIntRu(m[1] ?? "");
    if (v != null && v > 0) lastWeak = v;
  }
  return lastWeak;
}

function suggestInvoiceNumber(
  text: string,
  fileName: string,
): string | null {
  return (
    extractInvoiceNumberFromDocumentText(text) ??
    extractInvoiceNumberFromFileName(fileName)
  );
}

/**
 * Разбор уже извлечённого текста PDF (удобно для тестов и отладки).
 */
export function parseInvoiceExtractedText(
  text: string,
  opts?: { fileName?: string },
): ParseInvoicePdfResult {
  const warnings: string[] = [];
  const fileName = opts?.fileName ?? "";
  const normalized = normalizeExtractedInvoiceText(text);
  const suggestedInvoiceNumber = suggestInvoiceNumber(normalized, fileName);

  const totalRub = extractTotalRub(normalized);
  let lines = extractLinesFromRuInvoiceTable(normalized);
  if (lines.length === 0) {
    lines = extractLinesHeuristic(normalized);
  }
  if (lines.length === 0) {
    warnings.push(
      "Табличные строки не распознаны — укажите текст «ВЫСТАВЛЕНО» вручную",
    );
  }
  if (lines.length > 40) {
    warnings.push(
      "Слишком много строк по эвристике — показаны первые 40; проверьте вручную",
    );
    lines = lines.slice(0, 40);
  }
  if (totalRub == null) {
    warnings.push(
      "Итоговая сумма не найдена по шаблону «Всего к оплате» — проверьте сумму вручную",
    );
  }

  const summaryText =
    lines.length > 0 ? formatInvoiceParsedLinesAsText(lines) : "";
  return {
    lines,
    totalRub,
    summaryText,
    warnings,
    suggestedInvoiceNumber,
  };
}
