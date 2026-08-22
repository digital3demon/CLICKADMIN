import { describe, it, expect } from "vitest";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";

describe("personNameSurnameInitials", () => {
  it("returns empty for nullish or blank", () => {
    expect(personNameSurnameInitials(null)).toBe("");
    expect(personNameSurnameInitials(undefined)).toBe("");
    expect(personNameSurnameInitials("  ")).toBe("");
  });

  it("returns single word unchanged", () => {
    expect(personNameSurnameInitials("Иванов")).toBe("Иванов");
  });

  it("formats surname and initials", () => {
    expect(personNameSurnameInitials("Иванов пётр сергеевич")).toBe(
      "Иванов П. С.",
    );
  });

  it("strips parenthetical notes so list cells stay clean", () => {
    expect(personNameSurnameInitials("Фёдорова О.В. (каппа)")).toBe(
      "Фёдорова О.",
    );
    expect(personNameSurnameInitials("Новиков А.С. (11, 12 коронки)")).toBe(
      "Новиков А.",
    );
  });
});
