import { cleanLegalFullName } from "@/lib/document-workflow-markers";

export { cleanLegalFullName };

/** Поля клиники / контрагента для краткой строки «Реквизиты» в списках. */

export type CounterpartyRequisitesFields = {
  legalFullName?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  bankName?: string | null;
  bik?: string | null;
  settlementAccount?: string | null;
  correspondentAccount?: string | null;
};

/** Многострочный текст для ячейки таблицы (печать и экран). */
export function formatCounterpartyRequisitesSummary(
  c: CounterpartyRequisitesFields | null | undefined,
): string | null {
  if (!c) return null;
  const lines: string[] = [];
  const add = (labelRu: string, v: string | null | undefined) => {
    const t = (v ?? "").trim();
    if (t) lines.push(`${labelRu}: ${t}`);
  };
  add("Наименование", cleanLegalFullName(c.legalFullName));
  add("ИНН", c.inn);
  add("КПП", c.kpp);
  add("ОГРН", c.ogrn);
  add("Банк", c.bankName);
  add("БИК", c.bik);
  add("Р/с", c.settlementAccount);
  add("К/с", c.correspondentAccount);
  return lines.length > 0 ? lines.join("\n") : null;
}

/** Короткий вариант для ФинОтдела: только плательщик и ИНН. */
export function formatCounterpartyRequisitesShortSummary(
  c: CounterpartyRequisitesFields | null | undefined,
): string | null {
  if (!c) return null;
  const lines: string[] = [];
  const name = cleanLegalFullName(c.legalFullName);
  const inn = (c.inn ?? "").trim();
  if (name) lines.push(`Наименование: ${name}`);
  if (inn) lines.push(`ИНН: ${inn}`);
  return lines.length > 0 ? lines.join("\n") : null;
}
