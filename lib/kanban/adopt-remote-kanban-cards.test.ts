import { describe, expect, it } from "vitest";
import { adoptRemoteKanbanCards } from "@/lib/kanban/adopt-remote-kanban-cards";
import { defaultAppState } from "@/lib/kanban/model";
import { createCard } from "@/lib/kanban/model";

describe("adoptRemoteKanbanCards", () => {
  it("справочник не затирает живые карточки tenant-снимка", () => {
    const local = defaultAppState();
    const remote = defaultAppState();
    const boardId = remote.boards[0]!.id;
    const colId = remote.boards[0]!.columns[0]!.id;
    remote.boards[0]!.columns[0]!.cards.push(
      createCard({ id: "live", title: "Живая", linkedOrderId: "наряд-1" }),
    );
    local.boards[0]!.title = "Новое имя";
    local.boards[0]!.columns[0]!.cards = [];
    const adopted = adoptRemoteKanbanCards(local, remote);
    const b = adopted.boards.find((x) => x.id === boardId)!;
    expect(b.title).toBe("Новое имя");
    expect(b.columns.find((c) => c.id === colId)?.cards.some((c) => c.id === "live")).toBe(
      true,
    );
  });
});
