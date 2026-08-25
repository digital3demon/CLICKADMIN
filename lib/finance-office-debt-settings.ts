/**
 * Шаблоны письма о долге ФинОтдела.
 * Подстановки только токенами {{…}}; даты — календарь Europe/Moscow.
 */
import {
  formatInvoiceListPillLabel,
  formatUpdListPillLabel,
} from "@/lib/format-invoice-number-ru";
import { formatRuDateFromYmd, formatYmdInMsk } from "@/lib/msk-calendar";

export const FINANCE_OFFICE_DEBT_DEFAULT_DAYS = 10;

export const FINANCE_OFFICE_DEBT_DEFAULT_SUBJECT =
  "Напоминание об оплате {{номер}}";

export const FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE = `Здравствуйте.

Напоминаем об оплате счёта по наряду {{номер}} ({{пациент}}, {{клиника}}).

Счёт и УПД во вложении.`;

export const FINANCE_OFFICE_DOCUMENT_DEFAULT_SUBJECT =
  "Документы по наряду {{номер}}";

export const FINANCE_OFFICE_DOCUMENT_DEFAULT_TEMPLATE = `Здравствуйте.

Направляем документы по наряду {{номер}} ({{пациент}}, {{клиника}}).

{{счёт}}
{{упд}}

Файлы во вложении.`;

export const FINANCE_OFFICE_DEBT_PLACEHOLDERS = [
  { token: "{{номер}}", label: "Номер наряда" },
  { token: "{{пациент}}", label: "Пациент" },
  { token: "{{клиника}}", label: "Клиника" },
  { token: "{{счёт}}", label: "Счёт с датой" },
  { token: "{{упд}}", label: "УПД с датой" },
] as const;

export type FinanceOfficeDebtTemplateVars = {
  номер: string;
  пациент: string;
  клиника: string;
  счёт: string;
  упд: string;
};

/** Lookbehind вместо \\b: кириллица до «от» не даёт word-boundary. */
const HAS_OT_DATE = /(?<![A-Za-zА-Яа-яЁё0-9_])от\s/u;

function appendIssuedDate(label: string, issuedAt: Date | null | undefined): string {
  if (!issuedAt || HAS_OT_DATE.test(label)) return label;
  return `${label} от ${formatRuDateFromYmd(formatYmdInMsk(issuedAt))}`;
}

export function financeOfficeDebtInvoiceCaption(
  invoiceNumber: string | null | undefined,
  issuedAt: Date | null | undefined,
): string {
  const pill = formatInvoiceListPillLabel(invoiceNumber);
  const withDate = appendIssuedDate(pill, issuedAt);
  if (withDate === "СЧЕТ") return "—";
  return withDate;
}

export function financeOfficeDebtUpdCaption(
  updNumber: string | null | undefined,
  issuedAt: Date | null | undefined,
): string {
  const pill = formatUpdListPillLabel(updNumber);
  const withDate = appendIssuedDate(pill, issuedAt);
  if (withDate === "УПД") return "—";
  return withDate;
}

export function applyFinanceOfficeDebtTemplate(
  template: string,
  vars: FinanceOfficeDebtTemplateVars,
): string {
  return template
    .replaceAll("{{номер}}", vars.номер)
    .replaceAll("{{пациент}}", vars.пациент)
    .replaceAll("{{клиника}}", vars.клиника)
    .replaceAll("{{счёт}}", vars.счёт)
    .replaceAll("{{упд}}", vars.упд);
}

export function financeOfficeDebtEmailHtml(text: string): string {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<pre style="font-family:inherit;white-space:pre-wrap">${escaped}</pre>`;
}
