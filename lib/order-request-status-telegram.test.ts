import { describe, expect, it } from "vitest";
import { orderRequestStatusTelegramPhrase } from "@/lib/order-request-status-telegram";

describe("orderRequestStatusTelegramPhrase", () => {
  it("протетика — принят / отказ / в пути / на базе (кириллица), без проверил/готово", () => {
    expect(orderRequestStatusTelegramPhrase("prosthetics", "accepted")).toBe(
      "Заказ на протетику принят",
    );
    expect(orderRequestStatusTelegramPhrase("prosthetics", "rejected")).toBe(
      "Заказ на протетику отклонен",
    );
    expect(orderRequestStatusTelegramPhrase("prosthetics", "ordered")).toBe(
      "Протетика в пути",
    );
    expect(orderRequestStatusTelegramPhrase("prosthetics", "arrived")).toBe(
      "Протетика на базе",
    );
    expect(orderRequestStatusTelegramPhrase("prosthetics", "checked")).toBeNull();
    expect(orderRequestStatusTelegramPhrase("prosthetics", "completed")).toBeNull();
  });

  it("корректировка — подтвердили / отказ / вопрос (кириллица)", () => {
    expect(orderRequestStatusTelegramPhrase("correction", "accepted")).toBe(
      "Корректировку подтвердили",
    );
    expect(orderRequestStatusTelegramPhrase("correction", "rejected")).toBe(
      "В корректировке отказано",
    );
    expect(orderRequestStatusTelegramPhrase("correction", "clarify")).toBe(
      "Есть вопрос по корректировке",
    );
  });
});
