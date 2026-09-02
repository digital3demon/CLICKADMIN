import { afterEach, describe, expect, it } from "vitest";
import { buildKanbanTelegramActionInlineKeyboard } from "@/lib/telegram-kanban-action-keyboard";

describe("buildKanbanTelegramActionInlineKeyboard", () => {
  afterEach(() => {
    delete process.env.CRM_PUBLIC_BASE_URL;
  });

  it("без чата и без TG инициатора — null", () => {
    expect(
      buildKanbanTelegramActionInlineKeyboard({
        chatUrl: "",
      }),
    ).toBeNull();
  });

  it("только «Написать в чат» по https chatUrl", () => {
    const kb = buildKanbanTelegramActionInlineKeyboard({
      chatUrl: "https://click-lab.online/kanban?order=o1",
    });
    expect(kb?.inline_keyboard).toEqual([
      [{ text: "Написать в чат", url: "https://click-lab.online/kanban?order=o1" }],
    ]);
  });

  it("web_app по orderId + «Ответить» по username", () => {
    process.env.CRM_PUBLIC_BASE_URL = "https://click-lab.online";
    const kb = buildKanbanTelegramActionInlineKeyboard({
      chatUrl: "https://example.com/ignored",
      orderId: "order-1",
      actorTelegramUsername: "@ClickUser",
    });
    const row = kb!.inline_keyboard[0]!;
    expect(row).toHaveLength(2);
    expect(row[0]).toMatchObject({
      text: "Написать в чат",
      web_app: { url: expect.stringMatching(/^https:\/\/click-lab\.online\/tg-app\?/) },
    });
    expect(row[1]).toEqual({
      text: "Ответить",
      url: "https://t.me/ClickUser",
    });
  });

  it("«Ответить» по numeric telegramId если нет username", () => {
    const kb = buildKanbanTelegramActionInlineKeyboard({
      chatUrl: "https://click-lab.online/x",
      actorTelegramId: "123456789",
    });
    expect(kb!.inline_keyboard[0]![1]).toEqual({
      text: "Ответить",
      url: "tg://user?id=123456789",
    });
  });

  it("мусорный username — без «Ответить»", () => {
    const kb = buildKanbanTelegramActionInlineKeyboard({
      chatUrl: "https://click-lab.online/x",
      actorTelegramUsername: "ab",
    });
    expect(kb!.inline_keyboard[0]).toHaveLength(1);
    expect(kb!.inline_keyboard[0]![0]!.text).toBe("Написать в чат");
  });
});
