/**
 * Единый реестр полей договора (PDF AcroForm и подсказки для DOCX).
 */

export type ContractFieldDef = {
  key: string;
  label: string;
  pdfField: string;
  multiline?: boolean;
};

export const CONTRACT_FIELD_REGISTRY: ContractFieldDef[] = [
  { key: "contract_number", label: "Номер договора", pdfField: "contract_number" },
  { key: "contract_place", label: "Место заключения", pdfField: "contract_place" },
  { key: "contract_date", label: "Дата договора", pdfField: "contract_date" },
  { key: "client_name", label: "Наименование заказчика", pdfField: "client_name" },
  { key: "client_inn", label: "ИНН заказчика", pdfField: "client_inn" },
  { key: "client_kpp", label: "КПП заказчика", pdfField: "client_kpp" },
  { key: "client_ogrn", label: "ОГРН заказчика", pdfField: "client_ogrn" },
  { key: "client_ceo", label: "ФИО директора заказчика", pdfField: "client_ceo" },
  { key: "client_email", label: "E-mail заказчика", pdfField: "client_email" },
  { key: "client_address", label: "Юридический адрес", pdfField: "client_address" },
  {
    key: "client_requisites",
    label: "Банковские реквизиты заказчика",
    pdfField: "client_requisites",
    multiline: true,
  },
];

export const CONTRACT_PDF_FIELD_NAMES = CONTRACT_FIELD_REGISTRY.map((f) => f.pdfField);

export function contractFieldLabelByKey(key: string): string {
  const k = key.trim().toLowerCase();
  return (
    CONTRACT_FIELD_REGISTRY.find((f) => f.key === k)?.label ??
    CONTRACT_FIELD_REGISTRY.find((f) => f.pdfField === k)?.label ??
    key
  );
}
