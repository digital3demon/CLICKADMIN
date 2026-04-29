import { describe, expect, it } from "vitest";
import {
  correctionTrackFromText,
  resolveClinicId,
  resolveDoctorId,
} from "./order-import-export";

describe("resolveDoctorId", () => {
  const doctors = [
    { id: "d1", fullName: "Дацун Мария Михайловна" },
    { id: "d2", fullName: "Иванов Иван Иванович" },
    { id: "d3", fullName: "Петров Павел Петрович" },
    { id: "d4", fullName: "Петров Платон Игоревич" },
  ];

  it("находит доктора по фамилии и инициалам из таблицы", () => {
    expect(resolveDoctorId("Дацун М.М.", doctors)).toBe("d1");
  });

  it("находит по одной фамилии при однозначном совпадении", () => {
    expect(resolveDoctorId("Иванов", doctors)).toBe("d2");
  });

  it("не выбирает доктора по одной фамилии, если совпадений несколько", () => {
    expect(resolveDoctorId("Петров", doctors)).toBeNull();
  });

  it("разруливает несколько одинаковых фамилий по инициалам", () => {
    expect(resolveDoctorId("Петров П.И.", doctors)).toBe("d4");
  });

  it("поддерживает кириллицу вокруг ФИО в ячейке", () => {
    expect(resolveDoctorId("врач: Дацун М.М., ортопед", doctors)).toBe("d1");
  });
});

describe("resolveClinicId", () => {
  const clinics = [
    { id: "c1", name: "Студия 32 Казначейская ул., 4/16" },
    { id: "c2", name: "Смайл Центр" },
    { id: "c3", name: "Студия 32 Лиговский пр., 10" },
    { id: "c4", name: "ООО «Дент Деко» Дальневосточный пр., 12, корп. 2" },
  ];

  it("находит клинику, если в импорте название с адресом", () => {
    expect(resolveClinicId("Студия 32 Казначейская ул., 4/16", clinics)).toBe("c1");
  });

  it("находит клинику по укороченному варианту с адресным хвостом", () => {
    expect(resolveClinicId("Студия 32 Казначейская ул. д.4/16", clinics)).toBe("c1");
  });

  it("различает одинаковое название клиники по адресу", () => {
    expect(resolveClinicId("Студия 32 Лиговский пр., 10", clinics)).toBe("c3");
  });

  it("не выбирает клинику с одинаковым названием без адреса", () => {
    expect(resolveClinicId("Студия 32", clinics)).toBeNull();
  });

  it("находит клинику по названию+адресу, даже если в БД есть доп. префиксы", () => {
    expect(resolveClinicId("Дент Деко Дальневосточный пр., 12, корп. 2", clinics)).toBe("c4");
  });
});

describe("correctionTrackFromText", () => {
  it("распознаёт Переделку с кириллицей вокруг", () => {
    expect(correctionTrackFromText("в работе: ПЕРЕДЕЛКА по слепку")).toBe("REWORK");
  });

  it("распознаёт ортодонтию и ортопедию", () => {
    expect(correctionTrackFromText("коррекция ортодонтия")).toBe("ORTHODONTICS");
    expect(correctionTrackFromText("коррекция ортопедия")).toBe("ORTHOPEDICS");
  });

  it("возвращает null для пустого/нерелевантного ввода", () => {
    expect(correctionTrackFromText("")).toBeNull();
    expect(correctionTrackFromText("обычная работа")).toBeNull();
  });
});
