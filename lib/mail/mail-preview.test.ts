import { describe, expect, it } from "vitest";
import { previewFrom, previewFromMailBody } from "./mail-preview";

describe("previewFromMailBody", () => {
  it("uses plain text when available", () => {
    expect(previewFromMailBody("Здравствуйте, нужны сканы", null)).toBe("Здравствуйте, нужны сканы");
  });

  it("falls back to html when text part is empty", () => {
    expect(
      previewFromMailBody(
        null,
        "<div><p>Добрый день, пришлите <b>старые сканы</b> с более чёткой границей.</p></div>",
      ),
    ).toBe("Добрый день, пришлите старые сканы с более чёткой границей.");
  });

  it("returns null when both parts are empty", () => {
    expect(previewFromMailBody(null, "<style></style>")).toBeNull();
  });
});

describe("previewFrom", () => {
  it("removes logo alt text and image urls from previews", () => {
    expect(
      previewFrom(
        "Логотип [https://yastatic.net/logo.png] ЗДРАВСТВУЙТЕ, ваш доступ включён",
      ),
    ).toBe("ЗДРАВСТВУЙТЕ, ваш доступ включён");
  });
});
