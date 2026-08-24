import { describe, expect, it } from "vitest";
import {
  isKanbanAttachmentUploadRequest,
  isOrderAttachmentUploadAllowed,
  orderAttachmentUploadModule,
  orderChatApiModuleForPath,
} from "@/lib/role-module-paths";

const kanbanHeaders = {
  get: (n: string) => (n.toLowerCase() === "x-upload-context" ? "kanban" : null),
};

describe("orderChatApiModuleForPath", () => {
  it("kanban-chat → KANBAN_CARD_CHAT", () => {
    expect(
      orderChatApiModuleForPath("/api/orders/abc/kanban-chat", "GET"),
    ).toBe("KANBAN_CARD_CHAT");
    expect(
      orderChatApiModuleForPath("/api/orders/abc/kanban-chat", "POST"),
    ).toBe("KANBAN_CARD_CHAT");
    expect(
      orderChatApiModuleForPath("/api/orders/abc/kanban-chat", "PATCH"),
    ).toBe("KANBAN_CARD_CHAT");
    expect(
      orderChatApiModuleForPath("/api/orders/abc/kanban-chat", "DELETE"),
    ).toBe("KANBAN_CARD_CHAT");
  });

  it("kaiten-lab-mention-ack → ORDERS (просмотр)", () => {
    expect(
      orderChatApiModuleForPath("/api/orders/abc/kaiten-lab-mention-ack", "POST"),
    ).toBe("ORDERS");
  });
});

describe("orderAttachmentUploadModule", () => {
  it("форма наряда → ORDERS_EDIT", () => {
    expect(
      orderAttachmentUploadModule("/api/orders/x/attachments", "POST"),
    ).toBe("ORDERS_EDIT");
  });

  it("канбан (заголовок) → KANBAN_ATTACH_FILES", () => {
    expect(
      orderAttachmentUploadModule("/api/orders/x/attachments", "POST", {
        get: (n) => (n.toLowerCase() === "x-upload-context" ? "kanban" : null),
      }),
    ).toBe("KANBAN_ATTACH_FILES");
  });
});

describe("isKanbanAttachmentUploadRequest", () => {
  it("распознаёт заголовок kanban", () => {
    expect(
      isKanbanAttachmentUploadRequest({
        get: () => "kanban",
      }),
    ).toBe(true);
  });
});

describe("isOrderAttachmentUploadAllowed", () => {
  const path = "/api/orders/x/attachments";

  it("канбан: KANBAN_CARD_CHAT без KANBAN_ATTACH_FILES — разрешено", () => {
    expect(
      isOrderAttachmentUploadAllowed(
        { KANBAN_CARD_CHAT: true, KANBAN_ATTACH_FILES: false },
        path,
        "POST",
        kanbanHeaders,
      ),
    ).toBe(true);
  });

  it("канбан: без прав на работу с карточкой — запрещено", () => {
    expect(
      isOrderAttachmentUploadAllowed({}, path, "POST", kanbanHeaders),
    ).toBe(false);
  });

  it("форма наряда: ORDERS_CREATE без ORDERS_EDIT — разрешено", () => {
    expect(
      isOrderAttachmentUploadAllowed(
        { ORDERS_CREATE: true, ORDERS_EDIT: false },
        path,
        "POST",
      ),
    ).toBe(true);
  });
});
