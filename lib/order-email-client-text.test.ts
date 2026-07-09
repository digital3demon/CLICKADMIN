import { describe, expect, it } from "vitest";
import {
  appendMissingLinkSnippetsToClientOrderText,
  buildClientOrderTextFromEmailBody,
  extractLinkSnippetsFromEmailBody,
  resolveClientOrderTextFromEmailAndAi,
} from "./order-email-client-text";

const sokolovEmailBody = [
  "Вид работы: 12-22, 24 ПММА, А3,5",
  "12-22 Astra EV, МЮ Ультрастом, скан-маркеры Ультрастом",
  "24 Astra EV 3,6, Гео длинный скан-маркер",
  "Основания Ультрастом",
  "Сканы, фото по ссылке:",
  "https://disk.yandex.ru/d/NuiCmc5SQFNZpQ",
].join("\n");

const sokolovExpectedClientOrder = [
  "12-22, 24 ПММА, А3,5",
  "12-22 Astra EV, МЮ Ультрастом, скан-маркеры Ультрастом",
  "24 Astra EV 3,6, Гео длинный скан-маркер",
  "Основания Ультрастом",
  "Сканы, фото по ссылке:",
  "https://disk.yandex.ru/d/NuiCmc5SQFNZpQ",
].join("\n");

describe("buildClientOrderTextFromEmailBody", () => {
  it("keeps all work lines and strips Вид работы prefix", () => {
    expect(buildClientOrderTextFromEmailBody(sokolovEmailBody)).toBe(
      sokolovExpectedClientOrder,
    );
  });
});

describe("resolveClientOrderTextFromEmailAndAi", () => {
  it("prefers full email work text over shortened AI extract", () => {
    expect(
      resolveClientOrderTextFromEmailAndAi(
        "12-22, 24 ПММА, А3,5",
        sokolovEmailBody,
      ),
    ).toBe(sokolovExpectedClientOrder);
  });
});

describe("extractLinkSnippetsFromEmailBody", () => {
  it("extracts caption line + yandex disk url on next line", () => {
    expect(extractLinkSnippetsFromEmailBody(sokolovEmailBody)).toEqual([
      "Сканы, фото по ссылке:\nhttps://disk.yandex.ru/d/NuiCmc5SQFNZpQ",
    ]);
  });

  it("extracts inline label with url on same line", () => {
    expect(
      extractLinkSnippetsFromEmailBody(
        "Цвет https://disk.yandex.ru/d/cbZa2KJK1Suvdg",
      ),
    ).toEqual(["Цвет https://disk.yandex.ru/d/cbZa2KJK1Suvdg"]);
  });

  it("extracts prose + url on next line", () => {
    expect(
      extractLinkSnippetsFromEmailBody(
        "Прикрепляю ссылку на яндекс диск, где есть КТ, сканы пациента\nhttps://disk.yandex.ru/d/JtJRXnmwEUry0Q",
      ),
    ).toEqual([
      "Прикрепляю ссылку на яндекс диск, где есть КТ, сканы пациента\nhttps://disk.yandex.ru/d/JtJRXnmwEUry0Q",
    ]);
  });
});

describe("appendMissingLinkSnippetsToClientOrderText", () => {
  it("appends link block when AI clientOrderText omitted it", () => {
    const aiText = "12-22, 24 ПММА, А3,5";
    expect(appendMissingLinkSnippetsToClientOrderText(aiText, sokolovEmailBody)).toBe(
      `${aiText}\n\nСканы, фото по ссылке:\nhttps://disk.yandex.ru/d/NuiCmc5SQFNZpQ`,
    );
  });

  it("does not duplicate when url already in client order text", () => {
    expect(
      appendMissingLinkSnippetsToClientOrderText(
        sokolovExpectedClientOrder,
        sokolovEmailBody,
      ),
    ).toBe(sokolovExpectedClientOrder);
  });
});
