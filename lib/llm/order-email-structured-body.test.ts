import { describe, expect, it } from "vitest";
import {
  parseStructuredClinicEmailBody,
  canUseHeuristicPrefill,
  buildClientOrderTextFromBody,
} from "./order-email-structured-body";

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
      clinicHint: 'ООО "КХТЛ"',
      clientOrderText: 'ООО "КХТЛ"\nГладкий сплинт, фиксация на нижней челюсти',
      isStructured: true,
    });
  });

  it("parses Nobel template email with clinic on first line", () => {
    const body = [
      "Atribeante СПб Новочеркасская",
      "Врач: Невский Денис Дмитриевич",
      "Пациент: Павлухин СО",
      "Шаблон под пилотное сверление Nobel во 2 секторе 24 26 27",
      "Срок сдачи: На 14.07.26 в 19:00",
      "Система Nobel CC",
    ].join("\n");

    expect(parseStructuredClinicEmailBody(body)).toEqual({
      patientName: "Павлухин СО",
      doctorHint: "Невский Денис Дмитриевич",
      clinicHint: "Atribeante СПб Новочеркасская",
      clientOrderText: [
        "Atribeante СПб Новочеркасская",
        "Шаблон под пилотное сверление Nobel во 2 секторе 24 26 27",
        "Срок сдачи: На 14.07.26 в 19:00",
        "Система Nobel CC",
      ].join("\n"),
      isStructured: true,
    });
  });

  it("canUseHeuristicPrefill when patient and doctor line present", () => {
    const body = [
      "Atribeante СПб Новочеркасская",
      "Врач: Невский Денис Дмитриевич",
      "Пациент: Павлухин СО",
      "Шаблон под пилотное сверление Nobel во 2 секторе 24 26 27",
    ].join("\n");
    const parsed = parseStructuredClinicEmailBody(body);
    expect(
      canUseHeuristicPrefill({
        patientName: parsed.patientName,
        doctorHint: parsed.doctorHint,
        clinicHint: parsed.clinicHint,
        clientOrderText: parsed.clientOrderText ?? buildClientOrderTextFromBody(body),
        hasResolvedDoctor: false,
        hasResolvedClinic: false,
      }),
    ).toBe(true);
  });

  it("canUseHeuristicPrefill with sender-resolved doctor only", () => {
    expect(
      canUseHeuristicPrefill({
        patientName: "Иванов И.И.",
        doctorHint: null,
        clinicHint: null,
        clientOrderText: "Коронка 16, цвет A2, срок на пятницу",
        hasResolvedDoctor: true,
        hasResolvedClinic: false,
      }),
    ).toBe(true);
  });

  it("returns isStructured false for unstructured text", () => {
    expect(parseStructuredClinicEmailBody("просто текст без полей")).toEqual({
      patientName: null,
      doctorHint: null,
      clinicHint: "просто текст без полей",
      clientOrderText: "просто текст без полей",
      isStructured: false,
    });
  });
});
