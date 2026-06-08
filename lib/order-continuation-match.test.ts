import { describe, expect, it } from "vitest";
import {
  patientSurnameKey,
  patientSurnamesMatch,
} from "@/lib/order-continuation-match";

describe("patientSurnameKey", () => {
  it("берёт первое слово ФИО без учёта регистра", () => {
    expect(patientSurnameKey("Иванов А.С.")).toBe("иванов");
    expect(patientSurnameKey("иванов")).toBe("иванов");
  });

  it("пустой ввод — пустой ключ", () => {
    expect(patientSurnameKey("")).toBe("");
    expect(patientSurnameKey("   ")).toBe("");
  });
});

describe("patientSurnamesMatch", () => {
  it("совпадает фамилия при полном и кратком ФИО", () => {
    expect(patientSurnamesMatch("Иванов", "Иванов А.С.")).toBe(true);
    expect(patientSurnamesMatch("Иванов А.С.", "иванов")).toBe(true);
  });

  it("разные фамилии — отказ", () => {
    expect(patientSurnamesMatch("Иванов", "Петров")).toBe(false);
  });

  it("пустые значения — отказ", () => {
    expect(patientSurnamesMatch("", "Иванов")).toBe(false);
    expect(patientSurnamesMatch("Иванов", null)).toBe(false);
  });
});
