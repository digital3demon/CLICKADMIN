import { describe, expect, it } from "vitest";
import {
  formatOrderListAdminMemoHistoryLine,
  normalizeOrderListAdminMemoInput,
  type OrderListAdminMemoHistoryRow,
} from "./order-list-admin-memo";

describe("normalizeOrderListAdminMemoInput", () => {
  it("обрезает до 100 символов", () => {
    expect(normalizeOrderListAdminMemoInput("  " + "а".repeat(120))).toHaveLength(
      100,
    );
  });

  it("пустое → null", () => {
    expect(normalizeOrderListAdminMemoInput("   ")).toBeNull();
  });
});

describe("formatOrderListAdminMemoHistoryLine", () => {
  const when = () => "10.07.2026, 12:34";

  it("SET с кириллицей", () => {
    const row: OrderListAdminMemoHistoryRow = {
      id: "1",
      action: "SET",
      text: "Отправить СДЭК 29.07",
      authorLabel: "Оля",
      createdAt: "2026-07-10T09:34:00Z",
    };
    expect(formatOrderListAdminMemoHistoryLine(row, when)).toBe(
      "Оля · 10.07.2026, 12:34 — Отправить СДЭК 29.07",
    );
  });

  it("CLEAR", () => {
    const row: OrderListAdminMemoHistoryRow = {
      id: "2",
      action: "CLEAR",
      text: null,
      authorLabel: "Всеволод",
      createdAt: "2026-07-11T08:00:00Z",
    };
    expect(formatOrderListAdminMemoHistoryLine(row, when)).toContain("очистил");
  });
});
