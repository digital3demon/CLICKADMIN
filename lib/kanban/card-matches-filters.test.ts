import { describe, expect, it } from "vitest";
import {
  cardMatchesFilters,
  createCard,
  defaultAppState,
} from "@/lib/kanban/model";

describe("cardMatchesFilters · участник / ответственный", () => {
  it("участник: пустой массив на карточке, но Юля есть в кэше шапки", () => {
    const state = defaultAppState();
    state.filters.participantUserId = "u-юля";
    const board = state.boards[0]!;
    const card = createCard({
      id: "карта-шубина",
      title: "2608-372 Шубина Юля",
      linkedOrderId: "ord-шубина",
      assignees: [],
      participants: [],
    });
    expect(cardMatchesFilters(card, board, state, { memberHeads: null })).toBe(false);
    expect(
      cardMatchesFilters(card, board, state, {
        memberHeads: {
          "oid:ord-шубина": {
            assignees: [],
            participants: ["u-юля"],
            fingerprint: null,
            stageDue: "",
          },
        },
      }),
    ).toBe(true);
  });

  it("ответственный: кэш assignees, не participants", () => {
    const state = defaultAppState();
    state.filters.assigneeUserId = "u-юля";
    const board = state.boards[0]!;
    const card = createCard({
      id: "карта-степанов",
      title: "2607-299 Степанов А.В.",
      linkedOrderId: "ord-степанов",
      assignees: [],
      participants: [],
    });
    expect(
      cardMatchesFilters(card, board, state, {
        memberHeads: {
          "oid:ord-степанов": {
            assignees: [],
            participants: ["u-юля"],
            fingerprint: null,
            stageDue: "",
          },
        },
      }),
    ).toBe(false);
    expect(
      cardMatchesFilters(card, board, state, {
        memberHeads: {
          "oid:ord-степанов": {
            assignees: ["u-юля"],
            participants: [],
            fingerprint: null,
            stageDue: "",
          },
        },
      }),
    ).toBe(true);
  });

  it("связка «и»: нужна и Юля-ответственный, и Саша-участник", () => {
    const state = defaultAppState();
    state.filters.assigneeUserId = "u-юля";
    state.filters.participantUserId = "u-саша";
    state.filters.peopleJoin = "and";
    const board = state.boards[0]!;
    const card = createCard({
      id: "карта-кучинский",
      title: "2608-371 Кучинский О.",
      linkedOrderId: "ord-кучинский",
      assignees: ["u-юля"],
      participants: [],
    });
    expect(cardMatchesFilters(card, board, state, { memberHeads: null })).toBe(false);
    card.participants = ["u-саша"];
    expect(cardMatchesFilters(card, board, state, { memberHeads: null })).toBe(true);
  });

  it("связка «или»: достаточно Юли в ответственных или Саши в участниках", () => {
    const state = defaultAppState();
    state.filters.assigneeUserId = "u-юля";
    state.filters.participantUserId = "u-саша";
    state.filters.peopleJoin = "or";
    const board = state.boards[0]!;
    const onlyAssignee = createCard({
      id: "только-юля",
      title: "2608-372 Шубина",
      linkedOrderId: "ord-шубина",
      assignees: ["u-юля"],
      participants: [],
    });
    const onlyParticipant = createCard({
      id: "только-саша",
      title: "2607-299 Степанов А.В.",
      linkedOrderId: "ord-степанов",
      assignees: [],
      participants: ["u-саша"],
    });
    const neither = createCard({
      id: "чужой",
      title: "2608-300 Растегаев",
      linkedOrderId: "ord-растегаев",
      assignees: ["u-олег"],
      participants: [],
    });
    expect(cardMatchesFilters(onlyAssignee, board, state, { memberHeads: null })).toBe(
      true,
    );
    expect(
      cardMatchesFilters(onlyParticipant, board, state, { memberHeads: null }),
    ).toBe(true);
    expect(cardMatchesFilters(neither, board, state, { memberHeads: null })).toBe(false);
  });
});
