import { describe, expect, it } from "vitest";
import {
  orderKaitenMirrorApiModuleForPath,
  requiredModuleForPath,
} from "@/lib/role-module-paths";

describe("orderKaitenMirrorApiModuleForPath", () => {
  it("PATCH /api/orders/:id/kaiten → KANBAN_MOVE_COLUMNS (не ORDERS_EDIT)", () => {
    expect(
      orderKaitenMirrorApiModuleForPath("/api/orders/ord-1/kaiten", "PATCH"),
    ).toBe("KANBAN_MOVE_COLUMNS");
    expect(
      requiredModuleForPath(
        "/api/orders/ord-1/kaiten",
        "ORDERS",
        "PATCH",
      ),
    ).toBe("KANBAN_MOVE_COLUMNS");
  });

  it("GET /api/orders/:id/kaiten остаётся на ORDERS", () => {
    expect(
      orderKaitenMirrorApiModuleForPath("/api/orders/ord-1/kaiten", "GET"),
    ).toBeNull();
    expect(
      requiredModuleForPath("/api/orders/ord-1/kaiten", "ORDERS", "GET"),
    ).toBe("ORDERS");
  });

  it("вложенные kaiten/* не перехватываются", () => {
    expect(
      orderKaitenMirrorApiModuleForPath(
        "/api/orders/ord-1/kaiten/comments",
        "PATCH",
      ),
    ).toBeNull();
    expect(
      requiredModuleForPath(
        "/api/orders/ord-1/kaiten/comments",
        "ORDERS",
        "POST",
      ),
    ).toBe("ORDERS");
  });
});
