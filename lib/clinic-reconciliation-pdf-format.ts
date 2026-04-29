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

/** Дата DD.MM.YY (МСК), как в образце. */
export function formatDateDdMmYyMsk(iso: Date): string {
  const s = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(iso);
  return s.replace(/\//g, ".").replace(/\s/g, "");
}
