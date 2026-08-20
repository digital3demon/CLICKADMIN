/**
 * Номер наряда из поля «Основание» счёта на оплату.
 * Формат YYMM-NNN; номер договора и «от ДД.ММ» отбрасываются.
 * Границы без `\b` — рядом кириллица (Поздеева, Основание).
 */

import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";

/** «Основание» с OCR-латиницей: OCHOBание / OCHOBAHИE. */
const BASIS_HEAD_RE =
  /(?:[ОOоo][СCсc][НHнh][ОOоo][ВBвb][АAаa][НHнh]и[ЕEеe])/iu;

/** YYMM-NNN; тире с пробелами (PDF). Без `\b`. */
const DASHED_RE = /(\d{4})\s*[-–—−]\s*(\d{3})/gu;

type Token = { value: string; start: number; end: number };

function isNonWordBoundary(ch: string | undefined): boolean {
  if (ch == null || ch === "") return true;
  return !/[\p{L}\p{N}]/u.test(ch);
}

function collectDashedTokens(text: string): Token[] {
  const out: Token[] = [];
  DASHED_RE.lastIndex = 0;
  for (const m of text.matchAll(DASHED_RE)) {
    const yymm = m[1] ?? "";
    const seq = m[2] ?? "";
    const value = `${yymm}-${seq}`;
    if (!ORDER_NUMBER_PATTERN.test(value)) continue;
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const before = start > 0 ? text[start - 1] : undefined;
    const after = end < text.length ? text[end] : undefined;
    if (!isNonWordBoundary(before) || !isNonWordBoundary(after)) continue;
    out.push({ value, start, end });
  }
  return out;
}

function isContractToken(text: string, token: Token): boolean {
  const before = text.slice(Math.max(0, token.start - 48), token.start);
  // «Договор № 2408-003», не «Без договора 2608-211» (хвост «а » ломает $).
  if (/(?:^|[^\p{L}])договор\s*№?\s*$/iu.test(before)) return true;
  const after = text.slice(token.end);
  if (/^\s+от\s+\d{1,2}[./]/u.test(after)) return true;
  return false;
}

function hasSurnameAfter(text: string, token: Token): boolean {
  return /^\s+[\p{L}]{2,}/u.test(text.slice(token.end));
}

/** Кусок вокруг «Основание:»; если заголовка нет — весь текст. */
export function sliceInvoiceBasisRegion(raw: string): string {
  const text = String(raw ?? "").replace(/\u00a0/g, " ");
  if (!text.trim()) return "";
  BASIS_HEAD_RE.lastIndex = 0;
  const m = BASIS_HEAD_RE.exec(text);
  if (!m || m.index == null) return text;
  return text.slice(m.index, m.index + 600);
}

/**
 * Для колонки «Что найдено»: только «Основание» до таблицы товаров.
 * Граница без `\b` — рядом «№» и кириллица.
 */
const INVOICE_TABLE_START_RE = /(?:№\s*)?Товары\s*\(|Кол-во\s+Ед/u;

export function formatInvoiceBasisFoundLabel(raw: string): string {
  const slice = sliceInvoiceBasisRegion(raw);
  if (!slice.trim()) return "";
  const cut = slice.search(INVOICE_TABLE_START_RE);
  const head = (cut > 0 ? slice.slice(0, cut) : slice).replace(/\s+/g, " ").trim();
  if (!head) return "";
  return head.length > 220 ? `${head.slice(0, 219)}…` : head;
}

/**
 * Наряд из «Основание»: токен перед фамилиями, иначе последний
 * YYMM-NNN, который не договор и не «… от ДД.ММ».
 */
export function extractOrderNumberFromInvoiceBasisText(
  raw: string,
): string | null {
  const hay = sliceInvoiceBasisRegion(raw);
  if (!hay.trim()) return null;
  const tokens = collectDashedTokens(hay);
  if (tokens.length === 0) return null;
  const kept = tokens.filter((t) => !isContractToken(hay, t));
  const named = kept.filter((t) => hasSurnameAfter(hay, t));
  if (named.length > 0) return named[named.length - 1]!.value;
  if (kept.length > 0) return kept[kept.length - 1]!.value;
  return null;
}

/** Имя `Счет_на_оплату_№_1646_от_…` — подчёркивания как пробелы для номера счёта. */
export function invoiceFileNameForNumberExtract(fileName: string): string {
  return String(fileName || "").replace(/_/g, " ");
}
