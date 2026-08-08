import { describe, expect, it, afterEach, vi } from "vitest";
import {
  readTelegramWebAppInitData,
  readTelegramWebAppStartParam,
} from "@/lib/telegram-webapp-launch-params";

describe("telegram-webapp-launch-params", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("читает tgWebAppData и start из hash", () => {
    const init =
      "auth_date=1&user=%7B%22id%22%3A1%7D&hash=abc&start_param=o_or_x";
    const hashRaw = `tgWebAppData=${encodeURIComponent(init)}&tgWebAppStartParam=o_or_x`;
    vi.stubGlobal("window", {
      location: { hash: `#${hashRaw}`, search: "" },
      Telegram: undefined,
    });
    expect(readTelegramWebAppInitData()).toBe(init);
    expect(readTelegramWebAppStartParam()).toBe("o_or_x");
  });

  it("предпочитает Telegram.WebApp.initData", () => {
    vi.stubGlobal("window", {
      location: { hash: "", search: "" },
      Telegram: {
        WebApp: {
          initData: "from-api",
          initDataUnsafe: { start_param: "o_or_api" },
        },
      },
    });
    expect(readTelegramWebAppInitData()).toBe("from-api");
    expect(readTelegramWebAppStartParam()).toBe("o_or_api");
  });

  it("читает tgWebAppStartParam из query", () => {
    vi.stubGlobal("window", {
      location: {
        hash: "",
        search: "?tgWebAppStartParam=c_card1",
      },
      Telegram: undefined,
    });
    expect(readTelegramWebAppStartParam()).toBe("c_card1");
  });
});
