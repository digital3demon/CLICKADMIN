import { describe, expect, it } from "vitest";
import { formatCounterpartyRequisitesSummary } from "@/lib/format-counterparty-requisites-summary";

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
  });
});
