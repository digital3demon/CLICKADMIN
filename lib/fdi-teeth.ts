/** Порядок зубов на схеме: слева направо (18→11, зазор, 21→28) */
export const UPPER_FDI_ROW: readonly string[] = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
] as const;

/** Нижний ряд: 48→41, зазор, 31→38 */
export const LOWER_FDI_ROW: readonly string[] = [
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
] as const;

export const PERMANENT_FDI = new Set<string>([
  ...UPPER_FDI_ROW,
  ...LOWER_FDI_ROW,
]);

/** Молочные зубы FDI: 51–55, 61–65, 71–75, 81–85 (детская ортодонтия). */
export const PRIMARY_UPPER_FDI_ROW: readonly string[] = [
  "55",
  "54",
  "53",
  "52",
  "51",
  "61",
  "62",
  "63",
  "64",
  "65",
] as const;

export const PRIMARY_LOWER_FDI_ROW: readonly string[] = [
  "85",
  "84",
  "83",
  "82",
  "81",
  "71",
  "72",
  "73",
  "74",
  "75",
] as const;

export const PRIMARY_FDI = new Set<string>([
  ...PRIMARY_UPPER_FDI_ROW,
  ...PRIMARY_LOWER_FDI_ROW,
]);

export function isValidPermanentFdi(s: string): boolean {
  return PERMANENT_FDI.has(s);
}

export function isValidFdi(s: string): boolean {
  return PERMANENT_FDI.has(s) || PRIMARY_FDI.has(s);
}

export function sortTeethFdi(teeth: string[]): string[] {
  const order = new Map<string, number>();
  UPPER_FDI_ROW.forEach((t, i) => order.set(t, i));
  LOWER_FDI_ROW.forEach((t, i) => order.set(t, 100 + i));
  PRIMARY_UPPER_FDI_ROW.forEach((t, i) => order.set(t, 200 + i));
  PRIMARY_LOWER_FDI_ROW.forEach((t, i) => order.set(t, 300 + i));
  return [...new Set(teeth)].sort(
    (a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999),
  );
}
