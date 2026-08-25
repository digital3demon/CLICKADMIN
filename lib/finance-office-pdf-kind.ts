/**
 * Счёт на оплату vs УПД / счёт-фактура. Имя файла и текст PDF.
 * Границы без `\b` — рядом кириллица («УПД_статус», «от 20 августа»).
 */

export type FinanceOfficePdfKind = "invoice" | "upd" | "unknown";

function prettyName(fileName: string): string {
  return String(fileName || "").replace(/_/g, " ");
}

/** «Счет на оплату» в имени или тексте — счёт, не УПД. */
const INVOICE_PAY_RE = /сч[её]т\s+на\s+оплату/iu;

const UPD_NAME_RE = /упд/iu;
const FACTURA_RE = /сч[её]т[-\s]?фактур/iu;
const UPD_TITLE_RE = /универсальн\w{0,8}\s+передаточн/iu;

export function classifyFinanceOfficePdfKind(
  fileName: string,
  text?: string,
): FinanceOfficePdfKind {
  const name = prettyName(fileName);
  if (INVOICE_PAY_RE.test(name)) return "invoice";
  if (UPD_NAME_RE.test(name)) return "upd";
  if (FACTURA_RE.test(name) && !INVOICE_PAY_RE.test(name)) return "upd";

  const t = String(text || "");
  if (t.trim()) {
    if (INVOICE_PAY_RE.test(t)) return "invoice";
    if (UPD_TITLE_RE.test(t) || UPD_NAME_RE.test(t)) return "upd";
    if (FACTURA_RE.test(t) && !INVOICE_PAY_RE.test(t)) return "upd";
  }
  return "unknown";
}

/** Неопознанный PDF в пачке счетов оставляем счётом (как раньше). */
export function resolveFinanceOfficePdfKind(
  fileName: string,
  text?: string,
): "invoice" | "upd" {
  const k = classifyFinanceOfficePdfKind(fileName, text);
  return k === "upd" ? "upd" : "invoice";
}
