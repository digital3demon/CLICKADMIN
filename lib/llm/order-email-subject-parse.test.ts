import { describe, expect, it } from "vitest";
import { splitSubjectWorkAndPatient, stripWorkNamesFromPatientName } from "./order-email-subject-parse";

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
