import { describe, expect, it } from "vitest";
import {
  isCardMemberScopedTelegramEvent,
  kanbanCardTelegramMemberIds,
  uniqTelegramTargetUserIds,
} from "@/lib/telegram-kanban-card-scope";

describe("telegram-kanban-card-scope", () => {
  it("карточные события требуют людей на карточке", () => {
    expect(isCardMemberScopedTelegramEvent("tg_due_changed")).toBe(true);
    expect(isCardMemberScopedTelegramEvent("tg_order_prosthetics_changed")).toBe(
      true,
    );
    expect(isCardMemberScopedTelegramEvent("tg_comment_added")).toBe(true);
    expect(isCardMemberScopedTelegramEvent("tg_mentioned_in_comment")).toBe(
      false,
    );
    expect(isCardMemberScopedTelegramEvent("tg_production_new_card")).toBe(
      false,
    );
  });

  it("собирает ответственных и участников без дублей (кириллица в id)", () => {
    expect(
      kanbanCardTelegramMemberIds({
        assignees: ["u-всеволод", " u-арина "],
        participants: ["u-арина", "u-юля"],
      }),
    ).toEqual(["u-всеволод", "u-арина", "u-юля"]);
    expect(uniqTelegramTargetUserIds(["u-юля"], [], undefined)).toEqual([
      "u-юля",
    ]);
    expect(kanbanCardTelegramMemberIds({ assignees: [], participants: [] })).toEqual(
      [],
    );
  });
});
