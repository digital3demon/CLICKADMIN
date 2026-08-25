/** Почта для счетов: отдельное поле, иначе обычный e-mail при галочке. */
export function resolveClinicInvoiceEmail(clinic: {
  invoiceEmail?: string | null;
  email?: string | null;
  useEmailForInvoices?: boolean | null;
}): string {
  const dedicated = clinic.invoiceEmail?.trim() || "";
  if (dedicated) return dedicated;
  if (clinic.useEmailForInvoices) return clinic.email?.trim() || "";
  return "";
}
