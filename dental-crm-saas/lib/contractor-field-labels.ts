/** Подписи полей для краткого описания правок в журнале */

export const CLINIC_UPDATE_FIELD_LABELS: Record<string, string> = {
  name: "название",
  address: "адрес",
  isActive: "активность",
  notes: "заметки",
  worksWithReconciliation: "сверка",
  reconciliationFrequency: "периодичность сверки",
  contractSigned: "договор",
  contractNumber: "номер договора",
  worksWithEdo: "ЭДО",
  billingLegalForm: "юрлицо (ИП/ООО)",
  orderPriceListKind: "прайс в нарядах",
  legalFullName: "юр. наименование",
  legalAddress: "юр. адрес",
  inn: "ИНН",
  kpp: "КПП",
  ogrn: "ОГРН",
  bankName: "банк",
  bik: "БИК",
  settlementAccount: "р/с",
  correspondentAccount: "к/с",
  phone: "телефон",
  email: "e-mail",
  ceoName: "руководитель",
};

export const DOCTOR_UPDATE_FIELD_LABELS: Record<string, string> = {
  fullName: "ФИО",
  lastName: "фамилия",
  firstName: "имя",
  patronymic: "отчество",
  formerLastName: "фамилия ранее",
  specialty: "специальность",
  city: "город",
  email: "e-mail",
  clinicWorkEmail: "почта клиники",
  phone: "телефон",
  preferredContact: "связь",
  telegramUsername: "Telegram",
  birthday: "день рождения",
  particulars: "особенности",
  acceptsPrivatePractice: "частная практика",
  orderPriceListKind: "прайс в нарядах",
};

export function humanizeUpdatedFields(
  patchKeys: string[],
  labels: Record<string, string>,
): string {
  if (patchKeys.length === 0) return "";
  return patchKeys.map((k) => labels[k] ?? k).join(", ");
}
