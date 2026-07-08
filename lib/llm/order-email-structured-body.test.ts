import { describe, expect, it } from "vitest";
import { parseStructuredClinicEmailBody } from "./order-email-structured-body";

describe("parseStructuredClinicEmailBody", () => {
  it("parses typical splint order email", () => {
    const body = [
      'ООО "КХТЛ"',
      "Врач: Дуденкова Ксения Вячеславовна",
      "Пациент: Грунь Светлана Вячеславовна",
      "Гладкий сплинт, фиксация на нижней челюсти",
    ].join("\n");

    expect(parseStructuredClinicEmailBody(body)).toEqual({
      patientName: "Грунь Светлана Вячеславовна",
      doctorHint: "Дуденкова Ксения Вячеславовна",
      clinicHint: null,
      clientOrderText: 'ООО "КХТЛ"\nГладкий сплинт, фиксация на нижней челюсти',
      isStructured: true,
    });
  });

  it("returns isStructured false for unstructured text", () => {
    expect(parseStructuredClinicEmailBody("просто текст без полей")).toEqual({
      patientName: null,
      doctorHint: null,
      clinicHint: null,
      clientOrderText: "просто текст без полей",
      isStructured: false,
    });
  });
});
