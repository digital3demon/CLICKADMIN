import type { BillingLegalForm } from "@prisma/client";

export function legalEntityLabelFromClinic(c: {
  billingLegalForm: BillingLegalForm | null;
  legalFullName: string | null;
}): string {
  const form =
    c.billingLegalForm === "IP"
      ? "ИП"
      : c.billingLegalForm === "OOO"
        ? "ООО"
        : "Юр. лицо";
  const name = (c.legalFullName ?? "").trim();
  if (!name) return form;
  const short = name.length > 48 ? `${name.slice(0, 45)}…` : name;
  return `${form} · ${short}`;
}
