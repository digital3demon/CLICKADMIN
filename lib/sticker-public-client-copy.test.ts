import { describe, expect, it } from "vitest";
import {
  isHandedToAdminsKaitenColumnTitle,
  sanitizeStickerPublicCopy,
  stickerMovementSummaryForPublic,
  stickerRevisionSummaryIsBoardMovement,
} from "@/lib/sticker-public-client-copy";

describe("isHandedToAdminsKaitenColumnTitle", () => {
  it("узнаёт типичные подписи колонки", () => {
    expect(isHandedToAdminsKaitenColumnTitle("Сдана Админам")).toBe(true);
    expect(isHandedToAdminsKaitenColumnTitle("  сдана   админам  ")).toBe(true);
    expect(isHandedToAdminsKaitenColumnTitle("К исполнению")).toBe(false);
    expect(isHandedToAdminsKaitenColumnTitle(null)).toBe(false);
  });
});

describe("stickerRevisionSummaryIsBoardMovement", () => {
  it("только смена колонки CRM (без синхронизаций и прочего)", () => {
    expect(stickerRevisionSummaryIsBoardMovement("Оплата, Пациент")).toBe(false);
    expect(stickerRevisionSummaryIsBoardMovement("Синхронизация Кайтен")).toBe(false);
    expect(
      stickerRevisionSummaryIsBoardMovement("Тип карточки Кайтен, Синхронизация Кайтен"),
    ).toBe(false);
    expect(
      stickerRevisionSummaryIsBoardMovement("Колонка Кайтен (CRM), Оплата"),
    ).toBe(true);
    expect(
      stickerRevisionSummaryIsBoardMovement(
        "Тип карточки Кайтен, Синхронизация Кайтен, Колонка Кайтен (CRM)",
      ),
    ).toBe(true);
  });
});

describe("stickerMovementSummaryForPublic", () => {
  it("оставляет только колонку и чистит подписи", () => {
    expect(
      stickerMovementSummaryForPublic(
        "Колонка Кайтен (CRM), Оплата, ID карточки Кайтен",
      ),
    ).toBe("Колонка");
  });
});

describe("sanitizeStickerPublicCopy", () => {
  it("убирает латиницу Kaiten из текста активности", () => {
    expect(sanitizeStickerPublicCopy("Наряд опубликован в Kaiten")).toBe(
      "Наряд опубликован на доске",
    );
  });
});
