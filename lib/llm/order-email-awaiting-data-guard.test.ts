import { describe, expect, it } from "vitest";
import {
  deriveSourceDataFlagsFromEmailText,
  normalizeAwaitingDataFromEmailText,
} from "./order-email-awaiting-data-guard";

describe("normalizeAwaitingDataFromEmailText", () => {
  const yandexCase = `Декомпрессионный сплинт

Прикрепляю ссылку на яндекс диск, где есть КТ, сканы пациента, а также отдельно в виде файлов к письму
Дата сдачи: точно еще не определена, будем планировать ориентируясь на согласование работы с лабораторией
Посмотреть или скачать папку «Столбун Андрей Викторович» - https://disk.yandex.ru/d/JtJRXnmwEUry0Q`;

  it("clears awaitingData when Yandex link is already in email (Stolbun case)", () => {
    const result = normalizeAwaitingDataFromEmailText(
      { isAwaiting: true, reason: "ссылка" },
      yandexCase,
    );
    expect(result).toBeNull();
  });

  it("keeps awaitingData when client promises CT later without link", () => {
    const result = normalizeAwaitingDataFromEmailText(
      { isAwaiting: true, reason: "КТ" },
      "Сплинт сложный. КТ пришлю позже отдельным письмом.",
    );
    expect(result).toEqual({ isAwaiting: true, reason: "КТ" });
  });

  it("clears link awaiting when any https URL is present", () => {
    const result = normalizeAwaitingDataFromEmailText(
      { isAwaiting: true, reason: "ссылка" },
      "Сканы здесь: https://disk.yandex.ru/d/abc123",
    );
    expect(result).toBeNull();
  });
});

describe("deriveSourceDataFlagsFromEmailText", () => {
  it("sets hasCt and hasScans from Yandex disk text", () => {
    const flags = deriveSourceDataFlagsFromEmailText(
      "Прикрепляю ссылку на яндекс диск, где есть КТ, сканы пациента https://disk.yandex.ru/d/x",
      { hasScans: false, hasCt: false, hasMri: false, hasPhoto: false },
    );
    expect(flags.hasCt).toBe(true);
    expect(flags.hasScans).toBe(true);
  });
});
