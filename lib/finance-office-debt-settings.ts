export const FINANCE_OFFICE_DEBT_DEFAULT_DAYS = 10;

export const FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE = `Здравствуйте.

Напоминаем об оплате счёта по наряду {{номер}} ({{пациент}}, {{клиника}}).

Счёт и УПД во вложении.`;

export type FinanceOfficeDebtTemplateVars = {
  номер: string;
  пациент: string;
  клиника: string;
};

export function applyFinanceOfficeDebtTemplate(
  template: string,
  vars: FinanceOfficeDebtTemplateVars,
): string {
  return template
    .replaceAll("{{номер}}", vars.номер)
    .replaceAll("{{пациент}}", vars.пациент)
    .replaceAll("{{клиника}}", vars.клиника);
}

export function financeOfficeDebtEmailHtml(text: string): string {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<pre style="font-family:inherit;white-space:pre-wrap">${escaped}</pre>`;
}
