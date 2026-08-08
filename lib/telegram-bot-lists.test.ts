import { describe, expect, it } from "vitest";
import {
  resolveTelegramBotListCommand,
  telegramMenuLabelToCommand,
} from "@/lib/telegram-bot-menu-commands";

describe("telegramMenuLabelToCommand", () => {
  it("распознаёт подписи кнопок", () => {
    expect(telegramMenuLabelToCommand("Актуальная запись")).toBe("/shipact");
    expect(telegramMenuLabelToCommand("Отгрузки на сегодня")).toBe("/shipact");
    expect(telegramMenuLabelToCommand("Срок на завтра")).toBe("/dlinetm");
    expect(telegramMenuLabelToCommand("Мой срок на сегодня")).toBe("/dlinetd");
    expect(telegramMenuLabelToCommand("Срок карточек на сегодня")).toBe("/cardtd");
  });

  it("нормализует пробелы и регистр", () => {
    expect(telegramMenuLabelToCommand("  актуальная запись  ")).toBe("/shipact");
  });
});

describe("resolveTelegramBotListCommand", () => {
  it("распознаёт slash-команды", () => {
    expect(resolveTelegramBotListCommand("/shipact")).toBe("/shipact");
    expect(resolveTelegramBotListCommand("/shiptd")).toBe("/shiptd");
    expect(resolveTelegramBotListCommand("/dlinew@MyBot")).toBe("/dlinew");
    expect(resolveTelegramBotListCommand("/cardtm")).toBe("/cardtm");
  });

  it("не путает произвольный текст с командами", () => {
    expect(resolveTelegramBotListCommand("привет")).toBeNull();
  });
});
