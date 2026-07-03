import { describe, expect, it } from "vitest";
import {
  formatKanbanChatMessageDisplay,
  shouldShowKanbanChatSyncStatus,
} from "@/lib/kanban/chat-message-display";

describe("formatKanbanChatMessageDisplay", () => {
  it("снимает «!!!» и показывает тип корректировки", () => {
    const d = formatKanbanChatMessageDisplay("!!! катен тест");
    expect(d.kind).toBe("correction");
    expect(d.label).toBe("Корректировка");
    expect(d.body).toBe("катен тест");
  });

  it("снимает «???» и показывает тип протетики", () => {
    const d = formatKanbanChatMessageDisplay("??? мост на 36");
    expect(d.kind).toBe("prosthetics");
    expect(d.label).toBe("Заказ протетики");
    expect(d.body).toBe("мост на 36");
  });

  it("обычный комментарий без префикса", () => {
    const d = formatKanbanChatMessageDisplay("@ClickLab тест");
    expect(d.kind).toBe("plain");
    expect(d.label).toBeNull();
    expect(d.body).toBe("@ClickLab тест");
  });
});

describe("shouldShowKanbanChatSyncStatus", () => {
  it("скрывает «Синхронизировано» у корректировок", () => {
    expect(shouldShowKanbanChatSyncStatus("correction", "synced")).toBe(false);
    expect(shouldShowKanbanChatSyncStatus("correction", "failed")).toBe(true);
  });
});
