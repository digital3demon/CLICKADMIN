import { describe, expect, it } from "vitest";
import { orderRequestStatusTelegramPhrase } from "@/lib/order-request-status-telegram";

describe("orderRequestStatusTelegramPhrase", () => {
  it("протетика — конкретный статус, не состав склада", () => {
    expect(orderRequestStatusTelegramPhrase("prosthetics", "rejected")).toBe(
      "протетика: отказ",
    );
    expect(orderRequestStatusTelegramPhrase("prosthetics", "accepted")).toBe(
      "протетика: принята",
    );
    expect(orderRequestStatusTelegramPhrase("prosthetics", "arrived")).toBe(
      "протетика: приехала",
    );
    expect(orderRequestStatusTelegramPhrase("prosthetics", "ordered")).toBe(
      "протетика: в пути",
    );
  });

  it("корректировка — принята / отказ", () => {
    expect(orderRequestStatusTelegramPhrase("correction", "accepted")).toBe(
      "корректировка: принята",
    );
    expect(orderRequestStatusTelegramPhrase("correction", "rejected")).toBe(
      "корректировка: отказ",
    );
  });
});
