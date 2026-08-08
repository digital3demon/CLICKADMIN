import { describe, expect, it, afterEach } from "vitest";
import {
  telegramBotUsernameForMiniApp,
  telegramMiniAppOrderDeepLink,
  telegramMiniAppOrderWebAppUrl,
  telegramMiniAppShortName,
} from "@/lib/telegram-mini-app-links";

describe("telegramMiniAppLinks", () => {
  afterEach(() => {
    delete process.env.TELEGRAM_BOT_USERNAME;
    delete process.env.TELEGRAM_MINI_APP_SHORT_NAME;
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    delete process.env.CRM_PUBLIC_BASE_URL;
  });

  it("без username deep link null", () => {
    expect(telegramBotUsernameForMiniApp()).toBeNull();
    expect(telegramMiniAppOrderDeepLink("id1")).toBeNull();
  });

  it("собирает t.me deep link", () => {
    process.env.TELEGRAM_BOT_USERNAME = "@ClickCrmBot";
    process.env.TELEGRAM_MINI_APP_SHORT_NAME = "crm";
    expect(telegramMiniAppShortName()).toBe("crm");
    const url = telegramMiniAppOrderDeepLink("order-1");
    expect(url).toMatch(/^https:\/\/t\.me\/ClickCrmBot\/crm\?startapp=o_or_/);
  });

  it("web_app URL на домен CRM", () => {
    process.env.CRM_PUBLIC_BASE_URL = "https://click-lab.online";
    const url = telegramMiniAppOrderWebAppUrl("order-1");
    expect(url).toMatch(
      /^https:\/\/click-lab\.online\/tg-app\?startapp=o_or_/,
    );
  });
});
