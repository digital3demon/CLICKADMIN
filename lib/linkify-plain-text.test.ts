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

  it("uses filename as link label for angle-bracket google drive urls", () => {
    const segments = splitPlainTextLinks(
      "Подсекин Александр Валентинович-03.07.2026-lowerjaw.ply <https://drive.google.com/file/d/1Fdfh-v4jZk3WNTmERwGZzLdsK294CrvK/view?usp=drive_web>",
    );
    expect(segments).toEqual([
      {
        kind: "link",
        href: "https://drive.google.com/file/d/1Fdfh-v4jZk3WNTmERwGZzLdsK294CrvK/view?usp=drive_web",
        display: "Подсекин Александр Валентинович-03.07.2026-lowerjaw.ply",
      },
    ]);
  });

  it("uses filename as link label when url is on the next line", () => {
    const segments = splitPlainTextLinks(
      "Подсекин Александр Валентинович-03.07.2026-upperjaw.ply\nhttps://drive.google.com/file/d/19Xn6G3bbG5qHPa3gFV7X2ZSsxNhkjRk/view?usp=drive_web",
    );
    expect(segments).toEqual([
      {
        kind: "link",
        href: "https://drive.google.com/file/d/19Xn6G3bbG5qHPa3gFV7X2ZSsxNhkjRk/view?usp=drive_web",
        display: "Подсекин Александр Валентинович-03.07.2026-upperjaw.ply",
      },
    ]);
  });

  it("не дублирует ссылку, если ниже строка [https://…] с тем же url", () => {
    const segments = splitPlainTextLinks(
      "Цвет https://disk.yandex.ru/d/cbZa2KJK1Suvdg\n[https://disk.yandex.ru/d/cbZa2KJK1Suvdg]\nСканы https://disk.yandex.ru/d/CvRJKYB4LZjsWA\n[https://disk.yandex.ru/d/CvRJKYB4LZjsWA]",
    );
    const links = segments.filter((s) => s.kind === "link");
    expect(links).toHaveLength(2);
    expect(links[0]?.href).toBe("https://disk.yandex.ru/d/cbZa2KJK1Suvdg");
    expect(links[1]?.href).toBe("https://disk.yandex.ru/d/CvRJKYB4LZjsWA");
    expect(segments.some((s) => s.kind === "text" && s.value.includes("[https://"))).toBe(
      false,
    );
  });

  it("дедуплицирует экранированные \\[https://…\\]", () => {
    const segments = splitPlainTextLinks(
      "RVG https://disk.yandex.ru/i/kiGouEaqpXUtMg\n\\[https://disk.yandex.ru/i/kiGouEaqpXUtMg\\]",
    );
    expect(segments.filter((s) => s.kind === "link")).toHaveLength(1);
  });

  it("дедуплицирует [url] в той же строке после голого url", () => {
    const segments = splitPlainTextLinks(
      "Цвет https://disk.yandex.ru/d/cbZa2KJK1Suvdg [https://disk.yandex.ru/d/cbZa2KJK1Suvdg]",
    );
    expect(segments.filter((s) => s.kind === "link")).toHaveLength(1);
    expect(segments.some((s) => s.kind === "text" && s.value.includes("["))).toBe(false);
  });
});
