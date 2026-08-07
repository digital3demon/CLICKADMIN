/**
 * Извлечение номера наряда YYMM-NNN из OCR-текста печатного наряда.
 * Границы без `\b` — рядом кириллица (Гордиенко, занёс: Оля).
 * Также: URL/ID карточки Kaiten с распечатки (если QR не считался).
 */

import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";

/** Кандидаты вида 2607-422; допускает пробелы вокруг тире (OCR). Без `\b` (кириллица). */
const ORDER_NUM_IN_TEXT_RE =
  /(?<![\dA-Za-z])(\d{4})\s*[-–—−]\s*(\d{3})(?![\dA-Za-z])/g;

/** Legacy Kaiten URL в OCR-тексте распечатки наряда. */
const KAITEN_URL_RE =
  /(?:https?:\/\/)?(?:[\w.-]+\.)?kaiten\.ru\/(?:card\/)?(\d{4,})/gi;

export function extractOrderNumbersFromOcrText(raw: string): string[] {
  const text = String(raw ?? "");
  if (!text.trim()) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(ORDER_NUM_IN_TEXT_RE)) {
    const num = `${m[1]}-${m[2]}`;
    if (!ORDER_NUMBER_PATTERN.test(num)) continue;
    if (seen.has(num)) continue;
    seen.add(num);
    found.push(num);
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
      const yy = Number(yymm.slice(0, 2));
      const mm = Number(yymm.slice(2, 4));
      if (yy >= 20 && yy <= 39 && mm >= 1 && mm <= 12) score += 50;
    }
    return { n, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.n ?? null;
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
