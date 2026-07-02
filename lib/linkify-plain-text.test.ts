import { describe, expect, it } from "vitest";
import { splitPlainTextLinks } from "@/lib/linkify-plain-text";

describe("splitPlainTextLinks", () => {
  it("linkifies yandex disk URL from plain mail body", () => {
    const segments = splitPlainTextLinks(
      "https://disk.yandex.ru/d/3TZYqbdV6ic0bA\nОтправлено из мобильной Почты Mail.ru",
    );
    expect(segments).toEqual([
      {
        kind: "link",
        href: "https://disk.yandex.ru/d/3TZYqbdV6ic0bA",
        display: "https://disk.yandex.ru/d/3TZYqbdV6ic0bA",
      },
      { kind: "text", value: "\nОтправлено из мобильной Почты Mail.ru" },
    ]);
  });

  it("keeps кириллица around URL as separate text segments", () => {
    const segments = splitPlainTextLinks(
      "Ссылка на сканы https://example.com/path/file конец",
    );
    expect(segments[0]).toEqual({ kind: "text", value: "Ссылка на сканы " });
    expect(segments[1]).toEqual({
      kind: "link",
      href: "https://example.com/path/file",
      display: "https://example.com/path/file",
    });
    expect(segments[2]).toEqual({ kind: "text", value: " конец" });
  });

  it("leaves trailing period outside the link", () => {
    const segments = splitPlainTextLinks("Смотрите https://example.com.");
    expect(segments).toEqual([
      { kind: "text", value: "Смотрите " },
      {
        kind: "link",
        href: "https://example.com",
        display: "https://example.com",
      },
      { kind: "text", value: "." },
    ]);
  });
});
