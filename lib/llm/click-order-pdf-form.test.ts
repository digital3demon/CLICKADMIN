import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readFileSync, existsSync } from "node:fs";
import {
  buildClickOrderPdfPromptBlock,
  extractClickOrderPdfForm,
  isClickOrderPdfFormFieldNames,
  parsePatientNameFromOrderPdfFileName,
} from "./click-order-pdf-form";

describe("parsePatientNameFromOrderPdfFileName", () => {
  it("extracts FIO from patient pdf file name", () => {
    expect(parsePatientNameFromOrderPdfFileName("Кислова Стефания Владиславовна.pdf")).toBe(
      "Кислова Стефания Владиславовна",
    );
  });

  it("ignores order template names", () => {
    expect(parsePatientNameFromOrderPdfFileName("Наряд_Орто, Ортопедия (5).pdf")).toBeNull();
  });
});

describe("buildClickOrderPdfPromptBlock", () => {
  it("formats structured pdf fields for LLM", () => {
    const { promptBlock, clientOrderText } = buildClickOrderPdfPromptBlock({
      fileName: "test.pdf",
      clinicName: "ООО Реми",
      doctorName: "Крестелева Ирина",
      patientName: "Кислова Стефания Владиславовна",
      doctorPhone: "79187935516",
      telegram: null,
      orderDateRaw: "05.07.26",
      deliveryDateRaw: "26.07.26",
      comments: "С блестками",
      workDescription: "Марко Роса",
      textFields: { Text13: "53, 63", Text14: "55, 65" },
      checkedSources: ["Сканы"],
    });

    expect(promptBlock).toContain("Пациент: Кислова Стефания Владиславовна");
    expect(promptBlock).toContain("Работа / аппарат: Марко Роса");
    expect(promptBlock).toContain("Источник данных: Сканы");
    expect(clientOrderText).toContain("Зубы ВЧ: 53, 63");
  });
});

describe("isClickOrderPdfFormFieldNames", () => {
  it("detects CLICK e-order form markers", () => {
    expect(
      isClickOrderPdfFormFieldNames([
        "Text2",
        "Text3",
        "Text4",
        "Date7_af_date",
        "Date8_af_date",
        "C2",
      ]),
    ).toBe(true);
    expect(isClickOrderPdfFormFieldNames(["Text1", "Text2"])).toBe(false);
  });
});

const CLIENT_SAMPLE_PDF =
  "c:/Users/sevas/Downloads/Кислова Стефания Владиславовна.pdf";

describe("extractClickOrderPdfForm integration", () => {
  it("reads filled CLICK order pdf when sample file is present", async () => {
    if (!existsSync(CLIENT_SAMPLE_PDF)) return;

    const buf = readFileSync(CLIENT_SAMPLE_PDF);
    const extract = await extractClickOrderPdfForm(
      buf,
      "application/pdf",
      "Кислова Стефания Владиславовна.pdf",
    );
    expect(extract).not.toBeNull();
    expect(extract!.patientName).toBe("Кислова Стефания Владиславовна");
    expect(extract!.doctorName).toBe("Крестелева Ирина");
    expect(extract!.workDescription).toBe("Марко Роса");
    expect(extract!.checkedSources).toContain("Сканы");
  });
});
