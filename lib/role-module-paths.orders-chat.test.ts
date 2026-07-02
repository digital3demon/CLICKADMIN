import { describe, expect, it } from "vitest";
import {
  isOrderAttachmentUploadApiPath,
  orderChatApiModuleForPath,
  requiredModuleForPath,
} from "@/lib/role-module-paths";

describe("orderChatApiModuleForPath", () => {
  it("kanban-chat → ORDERS_CHAT", () => {
    expect(
      orderChatApiModuleForPath("/api/orders/abc/kanban-chat", "GET"),
    ).toBe("ORDERS_CHAT");
    expect(
      orderChatApiModuleForPath("/api/orders/abc/kanban-chat", "POST"),
    ).toBe("ORDERS_CHAT");
  });

  it("GET chat-corrections остаётся на ORDERS", () => {
    expect(
      requiredModuleForPath(
        "/api/orders/abc/chat-corrections",
        "ORDERS",
        "GET",
      ),
    ).toBe("ORDERS");
  });

  it("POST chat-corrections → ORDERS_CHAT", () => {
    expect(
      requiredModuleForPath(
        "/api/orders/abc/chat-corrections",
        "ORDERS",
        "POST",
      ),
    ).toBe("ORDERS_CHAT");
  });
});

describe("isOrderAttachmentUploadApiPath", () => {
  it("распознаёт POST вложений", () => {
    expect(
      isOrderAttachmentUploadApiPath("/api/orders/x/attachments", "POST"),
    ).toBe(true);
    expect(
      isOrderAttachmentUploadApiPath("/api/orders/x/attachments", "GET"),
    ).toBe(false);
  });
});
