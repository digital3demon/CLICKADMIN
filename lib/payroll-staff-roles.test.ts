import { describe, expect, it } from "vitest";
import { extractFreeformPayrollCandidates } from "@/lib/payroll-xlsx-freeform";
import {
  configMatchesOrderPriceItems,
  isPayrollConfigVisibleForStaffRole,
  payrollConfigMatchesQuery,
} from "@/lib/payroll-staff-roles";

describe("extractFreeformPayrollCandidates", () => {
  it("парсит простые колонки имя/сумма с кириллицей", () => {
    const rows = [
      ["Название", "Сумма"],
      ["Моделировка CAD", 850],
      ["Абатмент Ti", 600],
      ["₽", 100],
    ];
    const out = extractFreeformPayrollCandidates([{ name: "Лист1", rows }]);
    expect(out.map((x) => [x.name, x.amountRub])).toEqual([
      ["Моделировка CAD", 850],
      ["Абатмент Ti", 600],
    ]);
  });

  it("парсит многоколоночные пары как в образце лабы", () => {
    const rows = [
      ["ЦИФРА", "₽", null, "МАНУАЛ", "₽"],
      ["Дуга акрил CAD", 6500, null, "Акриловый протез", 10000],
      ["Моделировка CAD", 850, null, "Гербста с винтом", 4200],
    ];
    const out = extractFreeformPayrollCandidates([{ name: "Лист2", rows }]);
    const names = out.map((x) => x.name);
    expect(names).toContain("Дуга акрил CAD");
    expect(names).toContain("Акриловый протез");
    expect(names).toContain("Моделировка CAD");
    expect(names).toContain("Гербста с винтом");
    expect(out.find((x) => x.name === "Дуга акрил CAD")?.amountRub).toBe(6500);
  });
});

describe("payroll staff role visibility", () => {
  it("общий ФОТ виден всем", () => {
    expect(isPayrollConfigVisibleForStaffRole([], "role-a")).toBe(true);
    expect(isPayrollConfigVisibleForStaffRole([], null)).toBe(true);
  });

  it("ролевой ФОТ только своей роли", () => {
    expect(isPayrollConfigVisibleForStaffRole(["a", "b"], "a")).toBe(true);
    expect(isPayrollConfigVisibleForStaffRole(["a", "b"], "c")).toBe(false);
    expect(isPayrollConfigVisibleForStaffRole(["a"], null)).toBe(false);
  });
});

describe("configMatchesOrderPriceItems", () => {
  it("пересечение прайса", () => {
    expect(configMatchesOrderPriceItems(["1", "2"], new Set(["2", "9"]))).toBe(true);
    expect(configMatchesOrderPriceItems(["1"], new Set(["9"]))).toBe(false);
    expect(configMatchesOrderPriceItems([], new Set(["1"]))).toBe(false);
  });
});

describe("payrollConfigMatchesQuery", () => {
  const row = {
    name: "Моделировка CAD",
    amountRub: 850,
    priceItems: [{ code: "A-01", name: "Коронка" }],
  };
  it("ищет по имени, сумме и прайсу", () => {
    expect(payrollConfigMatchesQuery(row, "моделировка")).toBe(true);
    expect(payrollConfigMatchesQuery(row, "850")).toBe(true);
    expect(payrollConfigMatchesQuery(row, "A-01")).toBe(true);
    expect(payrollConfigMatchesQuery(row, "коронка")).toBe(true);
    expect(payrollConfigMatchesQuery(row, "нет такого")).toBe(false);
  });
});
