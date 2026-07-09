import { describe, expect, it } from "vitest";
import { isKanbanChatLocalOnlyRequest } from "@/lib/kanban/kanban-chat-local-query";

describe("isKanbanChatLocalOnlyRequest", () => {
  it("включает local=1 и local=true", () => {
    expect(
      isKanbanChatLocalOnlyRequest(
        new URL("https://x/api/orders/1/kanban-chat?local=1"),
      ),
    ).toBe(true);
    expect(
      isKanbanChatLocalOnlyRequest(
        new URL("https://x/api/orders/1/kanban-chat?local=true"),
      ),
    ).toBe(true);
  });

  it("включает sync=0 и sync=false", () => {
    expect(
      isKanbanChatLocalOnlyRequest(
        new URL("https://x/api/orders/1/kanban-chat?sync=0"),
      ),
    ).toBe(true);
    expect(
      isKanbanChatLocalOnlyRequest(
        new URL("https://x/api/orders/1/kanban-chat?sync=false"),
      ),
    ).toBe(true);
  });

  it("по умолчанию полный sync", () => {
    expect(
      isKanbanChatLocalOnlyRequest(new URL("https://x/api/orders/1/kanban-chat")),
    ).toBe(false);
    expect(
      isKanbanChatLocalOnlyRequest(
        new URL("https://x/api/orders/1/kanban-chat?local=0"),
      ),
    ).toBe(false);
  });
});
