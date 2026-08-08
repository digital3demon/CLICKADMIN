import { afterEach, describe, expect, it } from "vitest";
import {
  telegramApiBaseUrl,
  telegramApiHost,
  telegramBotApiUrl,
} from "@/lib/telegram-api-base";

describe("telegram-api-base", () => {
  afterEach(() => {
    delete process.env.TELEGRAM_API_BASE;
  });

  it("defaults to api.telegram.org", () => {
    delete process.env.TELEGRAM_API_BASE;
    expect(telegramApiBaseUrl()).toBe("https://api.telegram.org");
    expect(telegramApiHost()).toBe("api.telegram.org");
    expect(telegramBotApiUrl("TOKEN", "getMe")).toBe(
      "https://api.telegram.org/botTOKEN/getMe",
    );
  });

  it("uses TELEGRAM_API_BASE without trailing slash", () => {
    process.env.TELEGRAM_API_BASE = "https://bot.click-lab.online/";
    expect(telegramApiBaseUrl()).toBe("https://bot.click-lab.online");
    expect(telegramApiHost()).toBe("bot.click-lab.online");
    expect(telegramBotApiUrl("abc:1", "sendMessage")).toBe(
      "https://bot.click-lab.online/botabc%3A1/sendMessage",
    );
  });
});
