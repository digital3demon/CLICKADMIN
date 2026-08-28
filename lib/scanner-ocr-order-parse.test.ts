import { describe, expect, it } from "vitest";
import {
  extractOrderNumbersFromOcrText,
  orderNumberOcrConfusionVariants,
  pickBestOrderNumberFromOcr,
  pickKaitenCardIdFromOcr,
  pickOrderNumberAfterOcrConfusion,
} from "@/lib/scanner-ocr-order-parse";

describe("extractOrderNumbersFromOcrText", () => {
  it("находит номер в заголовке с кириллицей до и после", () => {
    const raw =
      "занёс: Оля\n2607-422 Гордиенко А.В. Егорова О.К. Ретенционная каппа 05.08";
    expect(extractOrderNumbersFromOcrText(raw)).toEqual(["2607-422"]);
  });

  it("пусто → []", () => {
    expect(extractOrderNumbersFromOcrText("")).toEqual([]);
    expect(extractOrderNumbersFromOcrText("Гордиенко без номера")).toEqual([]);
  });

  it("несколько номеров — все уникальные", () => {
    const raw = "2607-353 Чирухина … см. также 2607-366 Комягинская";
    expect(extractOrderNumbersFromOcrText(raw)).toEqual([
      "2607-353",
      "2607-366",
    ]);
  });

  it("допускает пробелы вокруг тире (OCR)", () => {
    expect(
      extractOrderNumbersFromOcrText(
        "2608 - 001 Журова Карпенко М.В. Каппа рет. 05.08",
      ),
    ).toEqual(["2608-001"]);
  });

  it("этикетка «№ заказа» с кириллицей до и после", () => {
    const raw =
      "Клиника Атрибут РЕМИ Пациент Калашникова Ю. № заказа: 2608-156 Доктор Невский";
    expect(extractOrderNumbersFromOcrText(raw)).toEqual(["2608-156"]);
  });

  it("этикетка без тире после «заказа», кириллица вокруг", () => {
    expect(
      extractOrderNumbersFromOcrText(
        "Клиника Скандинавия Пациент Барыкина Я. № заказа 2608246 Доктор Сильницкая",
      ),
    ).toEqual(["2608-246"]);
    expect(
      extractOrderNumbersFromOcrText(
        "Пациент Волк В. N3aka3a2608-306 Адрес пр. Тореза",
      ),
    ).toEqual(["2608-306"]);
  });

  it("не берёт LOT абатмента 260429-LS80 как наряд", () => {
    const geo =
      "Geo Multibase Abutment GM-IFU-KR-03 2025.01.14 LL2-SURO30-H2 260429-LS80 (01)08800028717599(10)260429-LS80(11)260429";
    expect(extractOrderNumbersFromOcrText(geo)).toEqual([]);
  });
});

describe("pickBestOrderNumberFromOcr", () => {
  it("берёт первый (заголовок) при нескольких", () => {
    expect(
      pickBestOrderNumberFromOcr(
        "2607-390 Шаповалова А. Перчак\nв тексте случайно 1999-001",
      ),
    ).toBe("2607-390");
  });

  it("на фото с абатментом предпочитает «№ заказа»", () => {
    const raw =
      "Geo 260429-LS80 2026.04.29\nКлиника Атрибут РЕМИ\nПациент Калашникова Ю.\n№ заказа: 2608-156";
    expect(pickBestOrderNumberFromOcr(raw)).toBe("2608-156");
  });

  it("этикетки отгрузки: Волк / Белокосова / Карлеев", () => {
    expect(
      pickBestOrderNumberFromOcr(
        "Клиника Ортодонтическая студия Адрес пр. Тореза д. 95 Доктор Скупченко М. Д. Пациент Волк В. № заказа 2608-306",
      ),
    ).toBe("2608-306");
    expect(
      pickBestOrderNumberFromOcr(
        "Клиника Меди ул. Маршала Захарова Пациент Белокосова Ю. № заказа 2608-245 Доктор Абдуллаев",
      ),
    ).toBe("2608-245");
    expect(
      pickBestOrderNumberFromOcr(
        "Клиника Атрибьют РЕМИ Новочеркасский пр. Доктор Невский Д. Д. Пациент Карлеев П. № заказа 2608-353",
      ),
    ).toBe("2608-353");
  });
});

describe("orderNumberOcrConfusionVariants", () => {
  it("5↔6 в хвосте: 2608-256 → 266, кириллица в номере не нужна", () => {
    expect(orderNumberOcrConfusionVariants("2608-256")).toEqual(
      expect.arrayContaining(["2608-266", "2608-255"]),
    );
    expect(orderNumberOcrConfusionVariants("2608-266")).toContain("2608-256");
  });
});

describe("pickOrderNumberAfterOcrConfusion", () => {
  it("при 256 и 266 выбирает наряд с фамилией с этикетки", () => {
    const ocr =
      "Клиника АтрибутКидс Доктор Егорова О. К. Пациент Ермаченков М. № заказа 2608-256";
    const picked = pickOrderNumberAfterOcrConfusion(
      "2608-256",
      [
        {
          orderNumber: "2608-256",
          patientName: "Сидоров П.",
          doctorName: "Невский",
        },
        {
          orderNumber: "2608-266",
          patientName: "Ермаченков М.",
          doctorName: "Егорова О. К.",
          clinicName: "АтрибутКидс",
        },
      ],
      ocr,
    );
    expect(picked?.orderNumber).toBe("2608-266");
  });

  it("без фамилий оставляет запрошенный номер (корректировка)", () => {
    expect(
      pickOrderNumberAfterOcrConfusion(
        "2608-306",
        [
          { orderNumber: "2608-305", patientName: "Сидоров" },
          { orderNumber: "2608-306", patientName: "Волк В." },
        ],
        "",
      )?.orderNumber,
    ).toBe("2608-306");
  });
});

describe("pickKaitenCardIdFromOcr", () => {
  it("достаёт id из URL kaiten в OCR", () => {
    expect(
      pickKaitenCardIdFromOcr(
        "https://clicklab.kaiten.ru/68081570\nШаповалова",
      ),
    ).toBe(68081570);
  });

  it("достаёт ID с распечатки карточки Kaiten", () => {
    expect(
      pickKaitenCardIdFromOcr(
        "2608-001 Журова\nID 68218911\nТип ОртоАппараты",
      ),
    ).toBe(68218911);
  });
});
