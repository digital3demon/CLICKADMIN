import { describe, expect, it } from "vitest";
import { cleanMailTextBody, mailHtmlToText } from "./mail-text-cleanup";

describe("cleanMailTextBody", () => {
  it("removes inline image labels and urls from mail text", () => {
    expect(
      cleanMailTextBody(
        "Логотип [https://yastatic.net/s3/id-static/templetter/_/C4eeAQgU.png]\n\nЗДРАВСТВУЙТЕ, DIGITALDEMONSTUDIO!",
      ),
    ).toBe("ЗДРАВСТВУЙТЕ, DIGITALDEMONSTUDIO!");
  });

  it("removes duplicate bracket yandex disk links when bare url is on previous line", () => {
    expect(
      cleanMailTextBody(
        "Цвет https://disk.yandex.ru/d/cbZa2KJK1Suvdg\n[https://disk.yandex.ru/d/cbZa2KJK1Suvdg]\nСканы https://disk.yandex.ru/d/CvRJKYB4LZjsWA\n[https://disk.yandex.ru/d/CvRJKYB4LZjsWA]",
      ),
    ).toBe(
      "Цвет https://disk.yandex.ru/d/cbZa2KJK1Suvdg\nСканы https://disk.yandex.ru/d/CvRJKYB4LZjsWA",
    );
  });

  it("keeps bracket-only url when it is the only occurrence", () => {
    expect(cleanMailTextBody("[https://disk.yandex.ru/d/only-here]")).toBe(
      "[https://disk.yandex.ru/d/only-here]",
    );
  });

  it("keeps regular non-image links in Russian text", () => {
    expect(
      cleanMailTextBody(
        "К письму приложены файлы на Яндекс Диске:\nголубева КПКТ.zip (82542801)",
      ),
    ).toBe("К письму приложены файлы на Яндекс Диске:\nголубева КПКТ.zip (82542801)");
  });

  it("не вырезает поле «картинка» из текста заказа (кириллица до и после)", () => {
    const body = [
      "работа Марко-Роса с опорой на 53,63",
      "картинка 37,33",
      "цвет 13,разноцветные блёстки",
      "металл 8",
    ].join("\n");
    expect(cleanMailTextBody(body)).toBe(body);
    expect(cleanMailTextBody("до картинка после")).toBe("до картинка после");
    expect(cleanMailTextBody("Картинка: 12")).toBe("Картинка: 12");
  });
});

describe("mailHtmlToText", () => {
  it("extracts Russian text from html-only forwarded mail", () => {
    expect(
      mailHtmlToText(
        "<div>Здравствуйте.</div><p>Пациент:</p><p>Оформите, пожалуйста, заказ: Ретенционная Пластинка.</p>",
      ),
    ).toBe(
      "Здравствуйте.\nПациент:\nОформите, пожалуйста, заказ: Ретенционная Пластинка.",
    );
  });

  it("decodes entities around Cyrillic text", () => {
    expect(mailHtmlToText("<p>Счёт ООО &quot;Роял Дентал Клиник&quot;</p>")).toBe(
      'Счёт ООО "Роял Дентал Клиник"',
    );
  });
});
