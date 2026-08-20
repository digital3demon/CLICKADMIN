/**
 * Тинт строки ФинОтдела: не «отгружено».
 * Синий — есть счёт (счёт важнее: раз выставлен, уже просчитано).
 * Зелёный — только просчитано, без счёта.
 * Янтарный/голубой акцент внимания из order-list-row-accent важнее.
 *
 * Счёт: галка «выставлен», номер в поле или загруженный файл.
 */

export type FinanceOfficeRowTintKind = "calculated" | "invoiced" | null;

export function orderHasFinanceInvoice(opts: {
  invoiceIssued?: boolean;
  invoiceNumber?: string | null;
  invoiceAttachmentId?: string | null;
}): boolean {
  if (opts.invoiceIssued === true) return true;
  if ((opts.invoiceNumber ?? "").trim()) return true;
  if ((opts.invoiceAttachmentId ?? "").trim()) return true;
  return false;
}

export function resolveFinanceOfficeRowTintKind(opts: {
  financeCalculated: boolean;
  invoiceIssued?: boolean;
  invoiceNumber?: string | null;
  invoiceAttachmentId?: string | null;
}): FinanceOfficeRowTintKind {
  if (orderHasFinanceInvoice(opts)) return "invoiced";
  if (opts.financeCalculated === true) return "calculated";
  return null;
}

const IDLE = "border-b border-[var(--card-border)]";

/** Фон строки: сплошной цвет пилюли, без градиента (скролл списка). */
export function financeOfficeRowTintClass(
  kind: FinanceOfficeRowTintKind,
): string {
  if (kind === "calculated") {
    return "finance-office-row-tint-calc border-b border-[var(--card-border)]";
  }
  if (kind === "invoiced") {
    return "finance-office-row-tint-inv border-b border-[var(--card-border)]";
  }
  return `${IDLE} transition-colors hover:bg-[var(--table-row-hover)]`;
}

export function financeOfficeMobileCardTintClass(
  kind: FinanceOfficeRowTintKind,
): string {
  if (kind === "calculated") {
    return "finance-office-row-tint-calc rounded-lg";
  }
  if (kind === "invoiced") {
    return "finance-office-row-tint-inv rounded-lg";
  }
  return "";
}
