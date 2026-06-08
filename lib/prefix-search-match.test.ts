import { describe, expect, it } from "vitest";
import { clinicMatchesSearch } from "./clients-list-search";
import {
  comboboxOptionMatchesPrefixQuery,
  textMatchesListQuery,
  textMatchesPrefixQuery,
} from "./prefix-search-match";

describe("prefix search match", () => {
  const smileClinic = "Смайл /Smile Центр Стоматологии — г. Иваново, ул. Лежневская, д. 46";

  it("matches Cyrillic prefix at start of clinic name", () => {
    expect(textMatchesPrefixQuery(smileClinic, "сма")).toBe(true);
  });

  it("matches Latin prefix on token after slash", () => {
    expect(textMatchesPrefixQuery(smileClinic, "smi")).toBe(true);
  });

  it("matches later word token in label", () => {
    expect(textMatchesPrefixQuery(smileClinic, "центр")).toBe(true);
    expect(textMatchesPrefixQuery(smileClinic, "леж")).toBe(true);
  });

  it("does not match inner substring that is not a token prefix", () => {
    expect(textMatchesPrefixQuery(smileClinic, "айл")).toBe(false);
    expect(textMatchesPrefixQuery(smileClinic, "mile")).toBe(false);
  });

  it("list query matches Latin fragment in bilingual clinic name", () => {
    expect(textMatchesListQuery(smileClinic, "smi")).toBe(true);
    expect(textMatchesListQuery(smileClinic, "сма")).toBe(true);
  });

  it("clinicMatchesSearch uses token-aware list matching", () => {
    expect(
      clinicMatchesSearch(
        {
          name: "Смайл /Smile Центр Стоматологии",
          address: "г. Иваново, ул. Лежневская, д. 46",
          legalFullName: null,
          email: null,
          phone: null,
          inn: null,
          ceoName: null,
        },
        "smi",
      ),
    ).toBe(true);
  });

  it("matches searchPrefixes the same way", () => {
    expect(
      comboboxOptionMatchesPrefixQuery(
        {
          label: "Смайл /Smile Центр Стоматологии",
          searchPrefixes: ["г. Иваново, ул. Лежневская, д. 46"],
        },
        "smi",
      ),
    ).toBe(true);
    expect(
      comboboxOptionMatchesPrefixQuery(
        {
          label: "Клиника на Ленина",
          searchPrefixes: ["OOO", "ООО Ромашка"],
        },
        "ooo",
      ),
    ).toBe(true);
  });
});
