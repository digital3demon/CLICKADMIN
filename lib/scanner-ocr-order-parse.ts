/**
 * Извлечение номера наряда YYMM-NNN из OCR-текста печатного наряда.
 * Границы без `\b` — рядом кириллица (Гордиенко, занёс: Оля).
 * Также: URL/ID карточки Kaiten с распечатки (если QR не считался).
 */

import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";

/** Кандидаты вида 2607-422; допускает пробелы вокруг тире (OCR). Без `\b` (кириллица). */
const ORDER_NUM_IN_TEXT_RE =
  /(?<![\dA-Za-z])(\d{4})\s*[-–—−]\s*(\d{3})(?![\dA-Za-z])/g;

/** «№ заказа 2608306» / «N3aka3a2608-245» — OCR часто глотает тире. */
const ORDER_NUM_AFTER_ZAKAZ_RE =
  /(?:заказ|zakaz|зака3|3aka3|n3ak|n3ax|nzak|зак[аa]з)[^\d]{0,12}(\d{4})\s*[-–—−]?\s*(\d{3})(?!\d)/gi;

/** Legacy Kaiten URL в OCR-тексте распечатки наряда. */
const KAITEN_URL_RE =
  /(?:https?:\/\/)?(?:[\w.-]+\.)?kaiten\.ru\/(?:card\/)?(\d{4,})/gi;

function isPlausibleOrderYymm(yymm: string): boolean {
  if (yymm.length !== 4) return false;
  const yy = Number(yymm.slice(0, 2));
  const mm = Number(yymm.slice(2, 4));
  return yy >= 20 && yy <= 39 && mm >= 1 && mm <= 12;
}

/** LOT абатмента 260429-LS80 не должен стать «нарядом» 2604-291. */
function isLotCodeCollision(text: string, yymm: string, start: number): boolean {
  const around = text.slice(Math.max(0, start - 2), start + 16);
  return new RegExp(
    `${yymm}\\d{2}\\s*[-–—−]\\s*[A-Za-z]`,
  ).test(around);
}

function pushOrderNum(
  found: string[],
  seen: Set<string>,
  text: string,
  yymm: string,
  nnn: string,
  start: number,
): void {
  const num = `${yymm}-${nnn}`;
  if (!ORDER_NUMBER_PATTERN.test(num)) return;
  if (!isPlausibleOrderYymm(yymm)) return;
  if (isLotCodeCollision(text, yymm, start)) return;
  if (seen.has(num)) return;
  seen.add(num);
  found.push(num);
}

export function extractOrderNumbersFromOcrText(raw: string): string[] {
  const text = String(raw ?? "");
  if (!text.trim()) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(ORDER_NUM_AFTER_ZAKAZ_RE)) {
    pushOrderNum(found, seen, text, m[1] ?? "", m[2] ?? "", m.index ?? 0);
  }
  for (const m of text.matchAll(ORDER_NUM_IN_TEXT_RE)) {
    pushOrderNum(found, seen, text, m[1] ?? "", m[2] ?? "", m.index ?? 0);
  }
  return found;
}

/**
 * Выбирает наиболее вероятный номер: первый в тексте (обычно заголовок наряда),
 * при нескольких — предпочитает с «разумным» YY (20–39) и месяцем 01–12.
 */
export function pickBestOrderNumberFromOcr(raw: string): string | null {
  const nums = extractOrderNumbersFromOcrText(raw);
  if (nums.length === 0) return null;
  if (nums.length === 1) return nums[0] ?? null;

  const scored = nums.map((n, index) => {
    const m = ORDER_NUMBER_PATTERN.exec(n);
    let score = 100 - index; // раньше в тексте — выше
    if (m) {
      const yymm = m[1] ?? "";
      if (isPlausibleOrderYymm(yymm)) score += 50;
    }
    const compact = n.replace("-", "");
    const idxHyphen = raw.indexOf(n);
    const idxCompact = raw.indexOf(compact);
    const idx = idxHyphen >= 0 ? idxHyphen : idxCompact;
    const window = raw.slice(Math.max(0, idx - 28), Math.max(0, idx)).toLowerCase();
    // «№ заказа» на этикетке отгрузки (кириллица; OCR: n3ak / 3aka3)
    if (
      /заказ/.test(window) ||
      /n3ak/.test(window) ||
      /3aka3/.test(window) ||
      /№\s*зак/.test(window)
    ) {
      score += 30;
    }
    return { n, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.n ?? null;
}

/**
 * OCR часто путает 5↔6 в хвосте YYMM-NNN («2608-266» → «2608-256»).
 * Одна замена в трёх цифрах номера, YYMM не трогаем.
 */
export function orderNumberOcrConfusionVariants(orderNumber: string): string[] {
  const m = ORDER_NUMBER_PATTERN.exec(String(orderNumber || "").trim());
  if (!m) return [];
  const yymm = m[1] ?? "";
  const nnn = m[2] ?? "";
  const out: string[] = [];
  for (let i = 0; i < nnn.length; i += 1) {
    const ch = nnn[i];
    const alt = ch === "5" ? "6" : ch === "6" ? "5" : null;
    if (!alt) continue;
    out.push(`${yymm}-${nnn.slice(0, i)}${alt}${nnn.slice(i + 1)}`);
  }
  return [...new Set(out)];
}

function foldOcrNameToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я]/gi, "");
}

/** Совпадение фамилий с этикетки (кириллица до/после номера). */
export function scoreOcrTextAgainstOrderNames(
  ocrText: string,
  names: Array<string | null | undefined>,
): number {
  const hay = foldOcrNameToken(ocrText);
  if (hay.length < 4) return 0;
  let score = 0;
  for (const name of names) {
    const parts = String(name || "")
      .split(/[\s,.;]+/)
      .map(foldOcrNameToken)
      .filter((p) => p.length >= 4);
    for (const p of parts) {
      if (hay.includes(p)) score += p.length;
    }
  }
  return score;
}

export type OcrOrderNameCandidate = {
  orderNumber: string;
  patientName?: string | null;
  doctorName?: string | null;
  clinicName?: string | null;
};

/**
 * Если OCR дал 2608-256, а в БД есть и 256, и 266 — берём того, чья фамилия
 * есть в тексте этикетки. Без имён оставляем запрошенный номер.
 */
export function pickOrderNumberAfterOcrConfusion<T extends OcrOrderNameCandidate>(
  requested: string,
  rows: T[],
  ocrText: string,
): T | null {
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0] ?? null;
  const scored = rows.map((row) => ({
    row,
    score: scoreOcrTextAgainstOrderNames(ocrText, [
      row.patientName,
      row.doctorName,
      row.clinicName,
    ]),
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const second = scored[1];
  if (best && best.score >= 4 && (!second || best.score > second.score)) {
    return best.row;
  }
  /* Имена не разобрали: оставляем то, что запросили (корректировка / OCR как есть). */
  return rows.find((r) => r.orderNumber === requested) ?? null;
}

/** ID карточки Kaiten из URL в OCR (распечатка наряда / карточки). */
export function pickKaitenCardIdFromOcr(raw: string): number | null {
  const text = String(raw ?? "");
  if (!text.trim()) return null;
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const m of text.matchAll(KAITEN_URL_RE)) {
    const id = Number(m[1]);
    if (!Number.isFinite(id) || id < 1000) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  // Поле «ID» на распечатке карточки Kaiten (8+ цифр), если URL не попал в OCR
  if (ids.length === 0) {
    const idField =
      /(?:^|[\s:])ID\s*[:：]?\s*(\d{6,})(?![\d])/im.exec(text) ??
      /(?:^|[\s])ID\s+(\d{6,})(?![\d])/im.exec(text);
    if (idField?.[1]) {
      const id = Number(idField[1]);
      if (Number.isFinite(id) && id >= 1000) ids.push(id);
    }
  }
  return ids[0] ?? null;
}
