import { describe, expect, it } from "vitest";
import { cleanMailTextBody } from "./mail-text-cleanup";

describe("cleanMailTextBody", () => {
  it("removes inline image labels and urls from mail text", () => {
    expect(
      cleanMailTextBody(
        "Логотип [https://yastatic.net/s3/id-static/templetter/_/C4eeAQgU.png]\n\nЗДРАВСТВУЙТЕ, DIGITALDEMONSTUDIO!",
      ),
    ).toBe("ЗДРАВСТВУЙТЕ, DIGITALDEMONSTUDIO!");
  });

  it("keeps regular non-image links in Russian text", () => {
    expect(
      cleanMailTextBody(
        "К письму приложены файлы на Яндекс Диске:\nголубева КПКТ.zip (82542801)",
      ),
    ).toBe("К письму приложены файлы на Яндекс Диске:\nголубева КПКТ.zip (82542801)");
  });
});
