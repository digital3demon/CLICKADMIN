import { describe, expect, it } from "vitest";
import {
  kanbanCardHoverPreviewBody,
  kanbanCardHoverPreviewFooterLines,
} from "@/lib/kanban/kanban-card-hover-preview";
import type { KanbanCard } from "@/lib/kanban/types";

function card(partial: Partial<KanbanCard>): KanbanCard {
  return {
    id: "c1",
    title: "2607-105 Болотова",
    description: "",
    cardTypeId: "",
    assignees: [],
    participants: [],
    dueDate: "",
    urgent: false,
    checklist: [],
    files: [],
    comments: [],
    activity: [],
    blocked: false,
    blockReason: "",
    blockedByUserId: "",
    blockedAt: "",
    createdByUserId: "",
    lastMovedAt: null,
    trackLane: "",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...partial,
  };
}

describe("kanbanCardHoverPreviewBody", () => {
  it("убирает служебный хвост CRM из описания", () => {
    const body = kanbanCardHoverPreviewBody(
      card({
        description:
          "Заказ от клиента:\nСплинт\n\nНаряд в CRM. Карточка Kaiten: #123",
      }),
    );
    expect(body).toContain("Сплинт");
    expect(body).not.toContain("Наряд в CRM");
  });
});

describe("kanbanCardHoverPreviewFooterLines", () => {
  it("собирает метаданные карточки", () => {
    const lines = kanbanCardHoverPreviewFooterLines(
      card({
        linkedOrderId: "ord-1",
        stageDueDate: "2026-07-23",
        urgent: true,
        files: [{ id: "f1" } as KanbanCard["files"][0]],
      }),
    );
    expect(lines).toContain("Наряд CRM");
    expect(lines).toContain("Срок: 2026-07-23");
    expect(lines).toContain("Срочно");
    expect(lines.some((l) => l.includes("файл"))).toBe(true);
  });
});
