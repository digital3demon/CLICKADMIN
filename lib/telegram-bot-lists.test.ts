import { describe, expect, it } from "vitest";
import {
  resolveTelegramBotListCommand,
  telegramMenuLabelToCommand,
} from "@/lib/telegram-bot-menu-commands";

describe("telegramMenuLabelToCommand", () => {
  it("распознаёт подписи кнопок", () => {
    expect(telegramMenuLabelToCommand("Отгрузки на сегодня")).toBe("/shiptd");
    expect(telegramMenuLabelToCommand("Срок на завтра")).toBe("/dlinetm");
  });

  it("нормализует пробелы и регистр", () => {
    expect(telegramMenuLabelToCommand("  отгрузки на сегодня  ")).toBe("/shiptd");
  });
});

describe("resolveTelegramBotListCommand", () => {
  it("распознаёт slash-команды", () => {
    expect(resolveTelegramBotListCommand("/shiptd")).toBe("/shiptd");
    expect(resolveTelegramBotListCommand("/dlinew@MyBot")).toBe("/dlinew");
  });

  it("не путает произвольный текст с командами", () => {
    expect(resolveTelegramBotListCommand("привет")).toBeNull();
  });
});
