/**
 * Извлечение номера наряда YYMM-NNN из OCR-текста печатного наряда.
 * Границы без `\b` — рядом кириллица (Гордиенко, занёс: Оля).
 */

import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";

/** Кандидаты вида 2607-422 в тексте; без word-boundary `\b` (кириллица). */
const ORDER_NUM_IN_TEXT_RE = /(?<![\dA-Za-z])(\d{4}-\d{3})(?![\dA-Za-z])/g;

export function extractOrderNumbersFromOcrText(raw: string): string[] {
  const text = String(raw ?? "");
  if (!text.trim()) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(ORDER_NUM_IN_TEXT_RE)) {
    const num = m[1] ?? "";
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
