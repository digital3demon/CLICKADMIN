import { describe, expect, it } from "vitest";
import {
  applyFinanceOfficeDebtTemplate,
  FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE,
} from "@/lib/finance-office-debt-settings";

describe("finance-office-debt-settings", () => {
  it("подставляет кириллические плейсхолдеры в шаблон", () => {
    const text = applyFinanceOfficeDebtTemplate(
      FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE,
      {
        номер: "2606-147",
        пациент: "Соколов",
        клиника: "Клиника «Радуга»",
      },
    );
    expect(text).toContain("2606-147");
    expect(text).toContain("Соколов");
    expect(text).toContain("Клиника «Радуга»");
    expect(text).not.toContain("{{номер}}");
  });
});
