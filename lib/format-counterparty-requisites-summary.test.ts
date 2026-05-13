import { describe, expect, it } from "vitest";
import {
  formatCounterpartyRequisitesShortSummary,
  formatCounterpartyRequisitesSummary,
} from "@/lib/format-counterparty-requisites-summary";

describe("formatCounterpartyRequisitesSummary", () => {
  it("removes service suffixes from legal name", () => {
    expect(
      formatCounterpartyRequisitesSummary({
        legalFullName: "ООО «Поколение» ООО ЭДО сверка",
        inn: "7805815753",
      }),
    ).toBe("Наименование: ООО «Поколение»\nИНН: 7805815753");

    expect(
      formatCounterpartyRequisitesSummary({
        legalFullName: "ООО «СПЕЙСДЕНТ» ООО бум.доки",
        inn: "7801669460",
      }),
    ).toBe("Наименование: ООО «СПЕЙСДЕНТ»\nИНН: 7801669460");

    expect(
      formatCounterpartyRequisitesShortSummary({
        legalFullName: "ООО «Пульс-сервис» ООО сверка ЭДО",
        inn: "7815023490",
      }),
    ).toBe("Наименование: ООО «Пульс-сервис»\nИНН: 7815023490");
  });
});
