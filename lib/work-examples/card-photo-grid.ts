/**
 * Сетка фото на плитке примера: все кадры видны, колонки от числа снимков.
 * 1 → одна ячейка на всю карточку; 2–3 → ряд; дальше ≈ квадрат (√n).
 */
export function workExampleCardPhotoGridCols(count: number): number {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 1) return 1;
  if (n <= 3) return n;
  return Math.ceil(Math.sqrt(n));
}
