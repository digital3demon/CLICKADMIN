import { describe, expect, it } from "vitest";
import {
  clickMigFormHostPathRedirect,
  isClickMigFormHost,
  isTrustedClickMigPublicHost,
} from "./form-host";

describe("clickmig form host", () => {
  it("test.click-lab.online — form-поддомен", () => {
    expect(isClickMigFormHost("test.click-lab.online")).toBe(true);
    expect(isClickMigFormHost("click-lab.online")).toBe(false);
  });

  it("корень form-поддомена → форма", () => {
    expect(clickMigFormHostPathRedirect("/")).toBe("/p/clickmig/form");
    expect(clickMigFormHostPathRedirect("/cabinet")).toBe("/p/clickmig/cabinet");
  });

  it("основной CRM-хост доверен для public API", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://click-lab.online";
    try {
      expect(isTrustedClickMigPublicHost("click-lab.online")).toBe(true);
      expect(isTrustedClickMigPublicHost("test.click-lab.online")).toBe(true);
      expect(isTrustedClickMigPublicHost("evil.example.com")).toBe(false);
      expect(isTrustedClickMigPublicHost("localhost")).toBe(
        process.env.NODE_ENV !== "production",
      );
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });
});
