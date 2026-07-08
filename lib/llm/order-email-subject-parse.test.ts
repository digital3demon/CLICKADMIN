import { describe, expect, it } from "vitest";
import { splitSubjectWorkAndPatient, stripWorkNamesFromPatientName, parsePatientNameFromEmailBody } from "./order-email-subject-parse";

const priceNames = [
  "Аппарат Марко Росса HAAS",
  "Аппарат Андрезена",
  "Каппа ретенционная\\элайнер",
];

describe("splitSubjectWorkAndPatient", () => {
  it("splits Marco Rosa work from patient surname in subject", () => {
    expect(splitSubjectWorkAndPatient("Марко Росса Джалилов М.", priceNames)).toEqual({
      patientName: "Джалилов М.",
      workNameHints: ["Аппарат Марко Росса HAAS"],
    });
  });

  it("returns empty when subject has no work prefix", () => {
    expect(splitSubjectWorkAndPatient("Джалилов М.", priceNames)).toEqual({
      patientName: null,
      workNameHints: [],
    });
  });
});

describe("stripWorkNamesFromPatientName", () => {
  it("removes work type accidentally placed into patientName", () => {
    expect(stripWorkNamesFromPatientName("Марко Росса Джалилов М.", priceNames)).toBe(
      "Джалилов М.",
    );
  });
});

describe("parsePatientNameFromEmailBody", () => {
  it("reads patient line from Russian email body", () => {
    const body = "Врач: Дуденкова К.\nПациент: Грунь Светлана Вячеславовна\nРабота: сплинт";
    expect(parsePatientNameFromEmailBody(body)).toBe("Грунь Светлана Вячеславовна");
  });

  it("returns null when patient line is missing", () => {
    expect(parsePatientNameFromEmailBody("Только текст заказа")).toBeNull();
  });
});
