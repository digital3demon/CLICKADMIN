import { describe, expect, it } from "vitest";
import {
  crmCityAddressTextClass,
  isClinicAddressInCrmCity,
} from "./crm-lab-city";

describe("isClinicAddressInCrmCity", () => {
  it("улица без города — свой (СПб)", () => {
    expect(isClinicAddressInCrmCity("Кондратьевский пр., д. 39")).toBe(true);
    expect(isClinicAddressInCrmCity("пр. Королёва, д. 65")).toBe(true);
  });

  it("явный СПб и район, кириллица до и после", () => {
    expect(
      isClinicAddressInCrmCity("клиника г. Санкт-Петербург, Невский пр."),
    ).toBe(true);
    expect(isClinicAddressInCrmCity("филиал г. Колпино., ул.Тазаева д.3")).toBe(
      true,
    );
  });

  it("чужой город — не свой (янтарь в списке)", () => {
    expect(isClinicAddressInCrmCity("г. Москва, Тверская ул., 1")).toBe(false);
    expect(isClinicAddressInCrmCity("Казань, ул. Баумана, 10")).toBe(false);
    expect(
      isClinicAddressInCrmCity("доставка Ленинградская область, Всеволожск"),
    ).toBe(false);
  });

  it("пустой адрес — не свой", () => {
    expect(isClinicAddressInCrmCity("")).toBe(false);
    expect(isClinicAddressInCrmCity("   ")).toBe(false);
  });
});

describe("crmCityAddressTextClass", () => {
  it("СПб и улица без города — без янтаря", () => {
    expect(crmCityAddressTextClass("Кондратьевский пр., д. 39")).not.toContain(
      "amber",
    );
    expect(crmCityAddressTextClass("г. Санкт-Петербург, Невский пр.")).not.toContain(
      "amber",
    );
  });

  it("чужой город — янтарь, кириллица до и после", () => {
    expect(
      crmCityAddressTextClass("клиника г. Москва, Тверская ул., 1 филиал"),
    ).toContain("amber");
  });

  it("пустой адрес — без янтаря", () => {
    expect(crmCityAddressTextClass("")).not.toContain("amber");
    expect(crmCityAddressTextClass("   ")).not.toContain("amber");
  });
});
