import { describe, expect, it } from "vitest";
import {
  clientCardOrderMatchesSearch,
  type ClientCardOrderItem,
} from "./client-card-order-search";

const base: ClientCardOrderItem = {
  id: "o1",
  orderNumber: "2607-141",
  patientName: "Гузь София",
  doctorName: "Федорова Анастасия Олеговна",
  clinicId: "c1",
  clinicName: "Смайл /Smile",
  stageLabel: "К исполнению",
  urgentLabel: "—",
  createdAtLabel: "08.07.2026, 15:13",
  shippedAtLabel: "—",
};

describe("clientCardOrderMatchesSearch", () => {
  it("находит по номеру наряда", () => {
    expect(clientCardOrderMatchesSearch(base, "2607", "clinic")).toBe(true);
  });

  it("находит по фамилии пациента с кириллицей до и после", () => {
    expect(clientCardOrderMatchesSearch(base, "гузь", "clinic")).toBe(true);
  });

  it("находит по врачу на карточке клиники", () => {
    expect(clientCardOrderMatchesSearch(base, "федорова", "clinic")).toBe(true);
  });

  it("находит по клинике на карточке врача", () => {
    expect(clientCardOrderMatchesSearch(base, "smile", "doctor")).toBe(true);
  });

  it("пустой запрос — все строки", () => {
    expect(clientCardOrderMatchesSearch(base, "", "clinic")).toBe(true);
  });
});
