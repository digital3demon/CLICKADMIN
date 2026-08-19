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

  it("снимает «ПТ:» и показывает тип пометки техники", () => {
    const d = formatKanbanChatMessageDisplay("шапка\nПТ: коронка 21\nхвост");
    expect(d.kind).toBe("pt");
    expect(d.label).toBe("ПТ");
    expect(d.body).toBe("шапка\nкоронка 21\nхвост");
  });

  it("обычный комментарий без префикса", () => {
    const d = formatKanbanChatMessageDisplay("@ClickLab тест");
    expect(d.kind).toBe("plain");
    expect(d.label).toBeNull();
    expect(d.body).toBe("@ClickLab тест");
  });
});

describe("shouldShowKanbanChatSyncStatus", () => {
  it("скрывает «Синхронизировано»", () => {
    expect(shouldShowKanbanChatSyncStatus("correction", "synced")).toBe(false);
    expect(shouldShowKanbanChatSyncStatus("plain", "synced")).toBe(false);
    expect(shouldShowKanbanChatSyncStatus("correction", "failed")).toBe(true);
    expect(shouldShowKanbanChatSyncStatus("plain", "pending")).toBe(true);
  });
});
