import { parseIntRu } from "@/lib/parse-invoice-extracted-text";

/** Отображение суммы по счёту в поле ввода: «22 500 ₽» (обычные пробелы в группах). */
export function formatInvoiceTotalRubRuDisplay(rub: number): string {
  if (!Number.isFinite(rub) || rub < 0) return "";
  const n = Math.round(rub);
  if (n > 99_999_999) return formatInvoiceTotalRubRuDisplay(99_999_999);
  const withGrouping = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(n);
  return `${withGrouping.replace(/\u00A0/g, " ").replace(/\u202F/g, " ")} ₽`;
}

export function formatInvoiceTotalRubRuDisplayNullable(
  rub: number | null | undefined,
): string {
  if (rub == null || !Number.isFinite(rub)) return "";
  return formatInvoiceTotalRubRuDisplay(rub);
}

/** Разбор ввода в целые рубли (пустая строка → null). */
export function parseInvoiceTotalRubRuInput(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const noCurrency = s
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    .replace(/₽/g, "")
    .replace(/руб\.?/gi, "")
    .trim();
  const v = parseIntRu(noCurrency);
  if (v == null || v < 0) return null;
  return v;
}
