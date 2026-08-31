/** Деньги как в образце сверки: «р. 19 000» (пробел после «р.»). */
export function formatRubPdf(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const [intPart, frac] = String(rounded).split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (frac != null && frac !== "00" && Number(frac) !== 0) {
    return `р. ${withSpaces},${frac.padEnd(2, "0")}`;
  }
  return `р. ${withSpaces}`;
}

/** Календарный YYYY-MM-DD → DD.MM.YY без сдвига UTC→МСК. */
export function formatYmdDdMmYy(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || "").trim());
  if (!m) return String(ymd || "").trim();
  return `${m[3]}.${m[2]}.${m[1].slice(2)}`;
}

/** Дата DD.MM.YY (МСК), как в образце. Не для границ периода сверки. */
export function formatDateDdMmYyMsk(iso: Date): string {
  const s = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(iso);
  return s.replace(/\//g, ".").replace(/\s/g, "");
}
