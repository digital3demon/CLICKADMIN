import { describe, expect, it } from "vitest";
import {
  applyFinanceOfficeDebtTemplate,
  financeOfficeDebtInvoiceCaption,
  financeOfficeDebtUpdCaption,
  FINANCE_OFFICE_DEBT_DEFAULT_SUBJECT,
  FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE,
  FINANCE_OFFICE_DOCUMENT_DEFAULT_SUBJECT,
} from "@/lib/finance-office-debt-settings";

const vars = {
  номер: "2606-147",
  пациент: "Соколов",
  клиника: "Клиника «Радуга»",
  счёт: "СЧЕТ №178 от 10.02.2026",
  упд: "УПД №1654 от 20.08.2026",
};

describe("finance-office-debt-settings", () => {
  it("подставляет кириллические плейсхолдеры в шаблон", () => {
    const text = applyFinanceOfficeDebtTemplate(
      FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE,
      vars,
    );
    expect(text).toContain("2606-147");
    expect(text).toContain("Соколов");
    expect(text).toContain("Клиника «Радуга»");
    expect(text).not.toContain("{{номер}}");
  });

  it("подставляет счёт и УПД с датой вокруг кириллицы", () => {
    const text = applyFinanceOfficeDebtTemplate(
      "Письмо: {{счёт}} и {{упд}} готовы.",
      vars,
    );
    expect(text).toBe(
      "Письмо: СЧЕТ №178 от 10.02.2026 и УПД №1654 от 20.08.2026 готовы.",
    );
  });

  it("подставляет тему письма с документами", () => {
    expect(
      applyFinanceOfficeDebtTemplate(FINANCE_OFFICE_DOCUMENT_DEFAULT_SUBJECT, vars),
    ).toBe("Документы по наряду 2606-147");
  });

  it("подставляет тему письма", () => {
    expect(
      applyFinanceOfficeDebtTemplate(FINANCE_OFFICE_DEBT_DEFAULT_SUBJECT, vars),
    ).toBe("Напоминание об оплате 2606-147");
  });
});

describe("financeOfficeDebtInvoiceCaption", () => {
  it("берёт номер и дату из поля, иначе дату выставления", () => {
    expect(
      financeOfficeDebtInvoiceCaption("№178 от 10.02.2026", null),
    ).toBe("СЧЕТ №178 от 10.02.2026");
    expect(
      financeOfficeDebtInvoiceCaption(
        "376",
        new Date("2026-08-11T21:00:00.000Z"),
      ),
    ).toBe("СЧЕТ №376 от 12.08.2026");
    expect(financeOfficeDebtInvoiceCaption("", null)).toBe("—");
  });
});

describe("financeOfficeDebtUpdCaption", () => {
  it("кириллица до и после номера УПД", () => {
    expect(
      financeOfficeDebtUpdCaption("шапка №1654 от 20 августа 2026 хвост", null),
    ).toBe("УПД №1654 от 20.08.2026");
  });
});
