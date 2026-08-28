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

describe("kanban-chat GET чтит local=1", () => {
  it("роут вызывает isKanbanChatLocalOnlyRequest", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "app/api/orders/[id]/kanban-chat/route.ts"),
      "utf8",
    );
    expect(src).toContain("isKanbanChatLocalOnlyRequest");
    expect(src).toContain("if (localOnly)");
  });
});

describe("kanban-chat POST не ждёт Kaiten", () => {
  it("новый комментарий уходит в after(finishKanbanChatPostBackground)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "app/api/orders/[id]/kanban-chat/route.ts"),
      "utf8",
    );
    expect(src).toContain("finishKanbanChatPostBackground");
    expect(src).toMatch(/after\(\(\) =>\s*\n\s*finishKanbanChatPostBackground/s);
    const tgIdx = src.lastIndexOf("await notifyTelegramForKanbanChatMentions");
    const commentIdx = src.lastIndexOf(
      "await notifyTelegramForKanbanChatCommentAdded",
    );
    const afterIdx = src.lastIndexOf("after(() =>");
    expect(tgIdx).toBeGreaterThan(0);
    expect(commentIdx).toBeGreaterThan(tgIdx);
    expect(afterIdx).toBeGreaterThan(commentIdx);
    const bgFn = src.slice(
      src.indexOf("async function finishKanbanChatPostBackground"),
      src.indexOf("export async function POST"),
    );
    expect(bgFn).not.toContain("notifyTelegramForKanbanChatMentions");
  });
});
