import { describe, expect, it } from "vitest";
import {
  clickMigFormHostPathRedirect,
  isClickMigFormHost,
  isClickMigPublicApiPath,
  isClickMigPublicOpen,
  isClickMigPublicSurfacePath,
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

  it("публичные пути формы и API", () => {
    expect(isClickMigPublicSurfacePath("/p/clickmig/form")).toBe(true);
    expect(isClickMigPublicSurfacePath("/clickmig")).toBe(false);
    expect(isClickMigPublicApiPath("/api/clickmig/public/config")).toBe(true);
    expect(isClickMigPublicApiPath("/api/clickmig/applications")).toBe(false);
  });

  it("публичный контур закрыт без CLICKMIG_PUBLIC_ENABLED", () => {
    const prev = process.env.CLICKMIG_PUBLIC_ENABLED;
    delete process.env.CLICKMIG_PUBLIC_ENABLED;
    try {
      expect(isClickMigPublicOpen()).toBe(false);
      process.env.CLICKMIG_PUBLIC_ENABLED = "1";
      expect(isClickMigPublicOpen()).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.CLICKMIG_PUBLIC_ENABLED;
      else process.env.CLICKMIG_PUBLIC_ENABLED = prev;
    }
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
