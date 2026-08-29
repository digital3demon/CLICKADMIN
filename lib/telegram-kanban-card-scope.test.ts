import { describe, expect, it } from "vitest";
import {
  isCardMemberScopedTelegramEvent,
  isPersonalSelfTelegramEvent,
  kanbanCardTelegramMemberIds,
  mergeTelegramSelfActorIntoTargets,
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
    expect(isPersonalSelfTelegramEvent("tg_person_added_to_card")).toBe(true);
    expect(isPersonalSelfTelegramEvent("tg_person_removed_from_card")).toBe(
      true,
    );
    expect(isPersonalSelfTelegramEvent("tg_due_changed")).toBe(true);
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

  it("срок без людей на карточке: автор в targets, если есть linesSelf", () => {
    expect(
      mergeTelegramSelfActorIntoTargets([], "u-всеволод", true),
    ).toEqual(["u-всеволод"]);
    expect(
      mergeTelegramSelfActorIntoTargets(["u-юля"], "u-всеволод", true),
    ).toEqual(["u-юля", "u-всеволод"]);
    expect(mergeTelegramSelfActorIntoTargets([], "u-всеволод", false)).toEqual(
      [],
    );
  });
});
