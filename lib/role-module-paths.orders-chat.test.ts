import { describe, expect, it } from "vitest";
import {
  isKanbanAttachmentUploadRequest,
  isKanbanLinkedReadAllowed,
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

  it("GET чата/файлов Kaiten → KANBAN_CARD_CHAT, POST комментария → ORDERS", () => {
    expect(
      orderChatApiModuleForPath("/api/orders/наряд-1/kaiten/chat", "GET"),
    ).toBe("KANBAN_CARD_CHAT");
    expect(
      orderChatApiModuleForPath("/api/orders/наряд-1/kaiten/comments", "GET"),
    ).toBe("KANBAN_CARD_CHAT");
    expect(
      orderChatApiModuleForPath("/api/orders/наряд-1/kaiten/card-head", "GET"),
    ).toBe("KANBAN_CARD_CHAT");
    expect(
      orderChatApiModuleForPath("/api/orders/наряд-1/kaiten/files/9", "GET"),
    ).toBe("KANBAN_CARD_CHAT");
    expect(
      orderChatApiModuleForPath("/api/orders/наряд-1/kaiten/comments", "POST"),
    ).toBe("ORDERS");
  });
});

describe("isKanbanLinkedReadAllowed", () => {
  it("производство без ORDERS читает чат и файлы", () => {
    expect(
      isKanbanLinkedReadAllowed(
        { KANBAN_CARD_CHAT: true },
        "/api/orders/наряд-1/kaiten/chat",
        "GET",
      ),
    ).toBe(true);
    expect(
      isKanbanLinkedReadAllowed(
        { KANBAN_ATTACH_FILES: true },
        "/api/orders/наряд-1/attachments/файл-1",
        "GET",
      ),
    ).toBe(true);
    expect(
      isKanbanLinkedReadAllowed(
        { KANBAN_CARD_CHAT: true },
        "/api/orders/наряд-1/kaiten/comments",
        "POST",
      ),
    ).toBe(false);
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
