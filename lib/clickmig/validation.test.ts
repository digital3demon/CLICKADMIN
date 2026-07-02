import { describe, expect, it } from "vitest";
import { defaultClickMigConfigJson } from "./defaults";
import { validateClickMigApplication } from "./validation";

describe("validateClickMigApplication", () => {
  const config = defaultClickMigConfigJson();

  it("требует сканы при кириллице в ФИО пациента", () => {
    const result = validateClickMigApplication(config, {
      patientName: "Иванов Пётр Сергеевич",
      doctorName: "Сидорова Анна",
      doctorEmail: "doc@clinic.ru",
      constructionTypeKey: "crown",
      material: "ZIRCONIA",
      teethFdi: ["11"],
      shadeCode: "A2",
    });
    expect(result.valid).toBe(false);
    const scans = result.hints.find((h) => h.field === "scans");
    expect(scans?.filled).toBe(false);
    expect(scans?.whyImportant).toMatch(/моделирован/i);
  });

  it("принимает заявку со сканами и ссылками", () => {
    const result = validateClickMigApplication(
      config,
      {
        patientName: "Петров",
        doctorName: "Врач",
        doctorEmail: "a@b.ru",
        constructionTypeKey: "crown",
        material: "EMAX",
        teethFdi: ["36", "37"],
        shadeCode: "C1",
        scanLinks: ["https://scan.example/файл.stl"],
      },
      { scanFileCount: 0 },
    );
    expect(result.valid).toBe(true);
  });
});
