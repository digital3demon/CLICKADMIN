import { describe, expect, it } from "vitest";
import {
  kaitenStatusDisplay,
  kaitenTrackLaneListLabel,
  splitOrderStatusPillLines,
} from "@/lib/kaiten-column-title";

describe("kaitenTrackLaneListLabel", () => {
  it("maps orthopedics and orthodontics with cyrillic labels", () => {
    expect(kaitenTrackLaneListLabel("ORTHOPEDICS")).toBe("Ортопедия");
    expect(kaitenTrackLaneListLabel("ORTHODONTICS")).toBe("Ортодонтия");
    expect(kaitenTrackLaneListLabel("тест")).toBe(null);
    expect(kaitenTrackLaneListLabel("TEST")).toBe("Тест");
  });

  it("returns null for empty and unknown lanes", () => {
    expect(kaitenTrackLaneListLabel(null)).toBe(null);
    expect(kaitenTrackLaneListLabel("")).toBe(null);
    expect(kaitenTrackLaneListLabel("REWORK")).toBe(null);
  });
});

describe("kaitenStatusDisplay", () => {
  it("демо: колонка · тип с кириллицей вокруг", () => {
    expect(
      kaitenStatusDisplay({
        kaitenColumnTitle: null,
        kaitenCardId: null,
        demoKanbanColumn: "DONE",
        demoCardTypeName: "Миослинт",
      }),
    ).toBe("Готово · Миослинт");
  });

  it("боевой Kaiten: колонка · тип как в демо", () => {
    expect(
      kaitenStatusDisplay({
        kaitenColumnTitle: "В работе",
        kaitenCardId: 12,
        demoCardTypeName: "Временные",
      }),
    ).toBe("В работе · Временные");
  });

  it("без типа — только колонка", () => {
    expect(
      kaitenStatusDisplay({
        kaitenColumnTitle: "Новые",
        kaitenCardId: 1,
      }),
    ).toBe("Новые");
  });

  it("пустой ввод — Нет в Kaiten", () => {
    expect(
      kaitenStatusDisplay({
        kaitenColumnTitle: null,
        kaitenCardId: null,
      }),
    ).toBe("Нет в Kaiten");
  });
});

describe("splitOrderStatusPillLines", () => {
  it("короткий статус — одна строка", () => {
    expect(splitOrderStatusPillLines("Готово")).toEqual(["Готово"]);
    expect(splitOrderStatusPillLines("Стоп")).toEqual(["Стоп"]);
  });

  it("кириллица до и после · — две строки если >20", () => {
    expect(splitOrderStatusPillLines("К исполнению · Накладки")).toEqual([
      "К исполнению",
      "Накладки",
    ]);
    expect(
      splitOrderStatusPillLines("К исполнению · Ортоаппараты Х хирургия"),
    ).toEqual(["К исполнению", "Ортоаппараты Х хирургия"]);
  });

  it("ровно 20 — не режем", () => {
    expect(splitOrderStatusPillLines("12345678901234567890")).toEqual([
      "12345678901234567890",
    ]);
  });

  it("пустой ввод", () => {
    expect(splitOrderStatusPillLines("")).toEqual([""]);
  });
});
