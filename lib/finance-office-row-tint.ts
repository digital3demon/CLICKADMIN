/**
 * Тинт строки ФинОтдела: не «отгружено».
 * Зелёный — просчитано, синий — счёт выставлен, градиент — оба.
 * Янтарный/голубой акцент внимания из order-list-row-accent важнее.
 */

export type FinanceOfficeRowTintKind = "calculated" | "invoiced" | "both" | null;

export function resolveFinanceOfficeRowTintKind(opts: {
  financeCalculated: boolean;
  invoiceIssued: boolean;
}): FinanceOfficeRowTintKind {
  const calc = opts.financeCalculated === true;
  const inv = opts.invoiceIssued === true;
  if (calc && inv) return "both";
  if (calc) return "calculated";
  if (inv) return "invoiced";
  return null;
}

const IDLE =
  "border-b border-[var(--card-border)] transition-colors hover:bg-[var(--table-row-hover)]";

/**
 * Фон на tr и td — sticky-ячейки иначе перекрывают тинт.
 */
export function financeOfficeRowTintClass(
  kind: FinanceOfficeRowTintKind,
): string {
  if (kind === "both") {
    return [
      "border-b border-[var(--card-border)]",
      "bg-gradient-to-r from-emerald-100/90 to-sky-200/85",
      "dark:from-emerald-950/55 dark:to-sky-950/50",
      "[&>td]:bg-gradient-to-r [&>td]:from-emerald-100/90 [&>td]:to-sky-200/85",
      "dark:[&>td]:from-emerald-950/55 dark:[&>td]:to-sky-950/50",
      "transition-colors hover:brightness-[1.03]",
    ].join(" ");
  }
  if (kind === "calculated") {
    return [
      "border-b border-[var(--card-border)]",
      "bg-emerald-100/90 dark:bg-emerald-950/50",
      "[&>td]:bg-emerald-100/90 dark:[&>td]:bg-emerald-950/50",
      "transition-colors hover:[&>td]:bg-emerald-50 dark:hover:[&>td]:bg-emerald-950/65",
    ].join(" ");
  }
  if (kind === "invoiced") {
    return [
      "border-b border-[var(--card-border)]",
      "bg-sky-100/90 dark:bg-sky-950/50",
      "[&>td]:bg-sky-100/90 dark:[&>td]:bg-sky-950/50",
      "transition-colors hover:[&>td]:bg-sky-50 dark:hover:[&>td]:bg-sky-950/65",
    ].join(" ");
  }
  return IDLE;
}

export function financeOfficeMobileCardTintClass(
  kind: FinanceOfficeRowTintKind,
): string {
  if (kind === "both") {
    return "rounded-lg bg-gradient-to-r from-emerald-100/90 to-sky-200/85 dark:from-emerald-950/55 dark:to-sky-950/50";
  }
  if (kind === "calculated") {
    return "rounded-lg bg-emerald-100/90 dark:bg-emerald-950/50";
  }
  if (kind === "invoiced") {
    return "rounded-lg bg-sky-100/90 dark:bg-sky-950/50";
  }
  return "";
}
