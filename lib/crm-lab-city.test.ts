import { describe, expect, it } from "vitest";
import { isClinicAddressInCrmCity } from "./crm-lab-city";

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

  it("чужой город не подсвечиваем", () => {
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
