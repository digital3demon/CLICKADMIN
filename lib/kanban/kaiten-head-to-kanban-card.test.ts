import { describe, expect, it } from "vitest";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import {
  applyKaitenHeadFieldsToKanbanCard,
  applyKaitenStageDueByOrderId,
  kaitenDueDatePatchFromYmd,
  ymdFromKaitenDueDate,
} from "@/lib/kanban/kaiten-head-to-kanban-card";
import { rememberOptimisticKanbanStageDue } from "@/lib/kanban/optimistic-kaiten-stage-due";

describe("ymdFromKaitenDueDate", () => {
  it("parses ISO date prefix", () => {
    expect(ymdFromKaitenDueDate("2026-08-04T09:00:00.000Z")).toBe("2026-08-04");
  });

  it("календарный день МСК, не UTC-префикс (кириллица в контексте не нужна)", () => {
    expect(ymdFromKaitenDueDate("2026-08-18T21:00:00.000Z")).toBe("2026-08-19");
    expect(ymdFromKaitenDueDate("2026-08-19T00:00:00.000+03:00")).toBe("2026-08-19");
  });

  it("принимает unix seconds", () => {
    const sec = Math.floor(Date.parse("2026-08-19T00:00:00.000+03:00") / 1000);
    expect(ymdFromKaitenDueDate(sec)).toBe("2026-08-19");
  });

  it("читает due_date из объекта Kaiten", () => {
    expect(ymdFromKaitenDueDate({ date: "2026-09-08T00:00:00.000+03:00" })).toBe(
      "2026-09-08",
    );
  });

  it("returns null for empty", () => {
    expect(ymdFromKaitenDueDate(null)).toBeNull();
    expect(ymdFromKaitenDueDate("")).toBeNull();
    expect(ymdFromKaitenDueDate(false)).toBeNull();
  });
});

describe("kaitenDueDatePatchFromYmd", () => {
  it("шлёт дату без времени на стену МСК", () => {
    expect(kaitenDueDatePatchFromYmd("2026-08-19")).toEqual({
      due_date: "2026-08-19T00:00:00.000+03:00",
      due_date_time_present: false,
    });
  });

  it("сбрасывает срок", () => {
    expect(kaitenDueDatePatchFromYmd("")).toEqual({
      due_date: null,
      due_date_time_present: false,
    });
  });
});

describe("applyKaitenHeadFieldsToKanbanCard", () => {
  it("updates urgent from asap without touching order fields", () => {
    const card = { urgent: false, stageDueDate: "", dueDate: "" };
    expect(applyKaitenHeadFieldsToKanbanCard(card, { asap: true })).toBe(true);
    expect(card.urgent).toBe(true);
  });

  it("ставит срок из обёртки data и dueDate", () => {
    const card = { urgent: false, stageDueDate: "", dueDate: "" };
    expect(
      applyKaitenHeadFieldsToKanbanCard(card, {
        data: { dueDate: "2026-09-08T09:00:00.000+03:00" },
      }),
    ).toBe(true);
    expect(card.stageDueDate).toBe("2026-09-08");
  });

  it("sets stage due from due_date", () => {
    const card = { urgent: false, stageDueDate: "", dueDate: "legacy" };
    expect(
      applyKaitenHeadFieldsToKanbanCard(card, { due_date: "2026-08-10T12:00:00Z" }),
    ).toBe(true);
    expect(card.stageDueDate).toBe("2026-08-10");
    expect(card.dueDate).toBe("");
  });

  it("не сбрасывает срок при пустом due_date из Kaiten", () => {
    const card = { urgent: true, stageDueDate: "2026-08-01", dueDate: "" };
    expect(applyKaitenHeadFieldsToKanbanCard(card, { due_date: null })).toBe(false);
    expect(card.stageDueDate).toBe("2026-08-01");
  });

  it("не сбрасывает срок при нераспознанном due_date", () => {
    const card = { urgent: false, stageDueDate: "2026-08-01", dueDate: "" };
    expect(applyKaitenHeadFieldsToKanbanCard(card, { due_date: "завтра" })).toBe(
      false,
    );
    expect(card.stageDueDate).toBe("2026-08-01");
  });
});

describe("applyKaitenStageDueByOrderId", () => {
  function stateWithCard(linkedOrderId: string, stageDueDate: string): KanbanAppState {
    return {
      boards: [
        {
          id: "b",
          title: "Ортопедия",
          columns: [
            {
              id: "c",
              title: "К исполнению",
              cards: [
                {
                  id: "card1",
                  title: "наряд 2608-001",
                  linkedOrderId,
                  stageDueDate,
                  dueDate: "",
                } as KanbanCard,
              ],
            },
          ],
        },
      ],
    } as KanbanAppState;
  }

  it("ставит срок с кириллицей в заголовке карточки", () => {
    const state = stateWithCard("ord1", "");
    expect(applyKaitenStageDueByOrderId(state, { ord1: "2026-08-20" })).toBe(true);
    expect(state.boards[0]!.columns[0]!.cards[0]!.stageDueDate).toBe("2026-08-20");
  });

  it("не снимает локальный срок пустым inbound", () => {
    const state = stateWithCard("ord-keep", "2026-08-26");
    expect(applyKaitenStageDueByOrderId(state, { "ord-keep": null })).toBe(false);
    expect(state.boards[0]!.columns[0]!.cards[0]!.stageDueDate).toBe("2026-08-26");
  });

  it("не откатывает оптимистичный срок", () => {
    rememberOptimisticKanbanStageDue("ord-opt", "2026-08-21");
    const state = stateWithCard("ord-opt", "2026-08-21");
    expect(applyKaitenStageDueByOrderId(state, { "ord-opt": "" })).toBe(false);
    expect(state.boards[0]!.columns[0]!.cards[0]!.stageDueDate).toBe("2026-08-21");
  });
});
