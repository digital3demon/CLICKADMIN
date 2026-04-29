import { describe, expect, it } from "vitest";
import { isKaitenExternalPath } from "./commercial-blocked-paths";

describe("isKaitenExternalPath", () => {
  it("блокирует внешние маршруты kaiten.ru / интеграции", () => {
    expect(isKaitenExternalPath("/directory/kaiten")).toBe(true);
    expect(isKaitenExternalPath("/directory/kaiten/types")).toBe(true);
    expect(isKaitenExternalPath("/api/kaiten-card-types")).toBe(true);
    expect(isKaitenExternalPath("/api/orders/kaiten-titles-sync")).toBe(true);
    expect(isKaitenExternalPath("/api/orders/ord_1/kaiten/comments")).toBe(true);
  });

  it("не трогает встроенный /api/kanban и обычные наряды", () => {
    expect(isKaitenExternalPath("/api/kanban/boards")).toBe(false);
    expect(isKaitenExternalPath("/api/orders/abc123")).toBe(false);
  });
});
