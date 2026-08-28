import { describe, expect, it } from "vitest";
import {
  collectDeadlineReminderJobs,
  deadlineReminderSentKey,
  parseDeadlineReminderSentState,
} from "@/lib/kanban-deadline-reminder";
import { createCard, KANBAN_BOARD_MY_CARDS_ID } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";

function stateWith(cards: ReturnType<typeof createCard>[]): KanbanAppState {
  return {
    version: 1,
    boards: [
      {
        id: "b-ortho",
        title: "Ортопедия",
        columns: [{ id: "c1", title: "В работе", cards }],
        users: [],
        cardTypes: [],
      },
      {
        id: KANBAN_BOARD_MY_CARDS_ID,
        title: "Мои",
        columns: [],
        users: [],
        cardTypes: [],
      },
    ],
    activeBoardId: "b-ortho",
    search: "",
    viewMode: "list",
    calendarMonth: { y: 2026, m: 8 },
    filters: {
      cardTypeId: "",
      due: "",
      assigneeUserId: "",
      participantUserId: "",
    },
    filterTemplates: [],
  };
}

describe("collectDeadlineReminderJobs", () => {
  it("берёт карточку на сегодня с кириллицей в заголовке, не виртуальную доску", () => {
    const jobs = collectDeadlineReminderJobs(
      stateWith([
        createCard({
          id: "due-today",
          title: "2608-325 Загоскина Я. Самус Н. Э.",
          assignees: ["u-юля"],
          participants: ["u-админ"],
          stageDueDate: "2026-08-28",
        }),
        createCard({
          id: "due-tomorrow",
          title: "завтра",
          assignees: ["u-юля"],
          stageDueDate: "2026-08-29",
        }),
        createCard({
          id: "blocked",
          title: "стоп",
          assignees: ["u-юля"],
          stageDueDate: "2026-08-28",
          blocked: true,
          blockReason: "ждём",
        }),
      ]),
      "2026-08-28",
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.card.id).toBe("due-today");
    expect(jobs[0]!.userIds).toEqual(["u-юля", "u-админ"]);
    expect(jobs[0]!.boardId).toBe("b-ortho");
  });
});

describe("parseDeadlineReminderSentState", () => {
  it("не дублирует ключ в тот же день", () => {
    const parsed = parseDeadlineReminderSentState({
      ymd: "2026-08-28",
      keys: [deadlineReminderSentKey("due-today", "u-юля")],
    });
    expect(parsed.keys).toContain("due-today:u-юля");
  });
});
