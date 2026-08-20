import { describe, expect, it } from "vitest";
import {
  findMentionDraft,
  parseMentionUserIdsFromText,
} from "@/lib/kanban-comment-mentions";

describe("findMentionDraft", () => {
  it("ловит @ после кириллицы с пробелом", () => {
    const text = "Всеволод @ро";
    expect(findMentionDraft(text, text.length)).toEqual({
      start: 9,
      end: text.length,
      query: "ро",
    });
  });

  it("открывает список сразу после @ (пустой query)", () => {
    const text = "оттиск пришел и накуска!!! @";
    expect(findMentionDraft(text, text.length)).toEqual({
      start: text.lastIndexOf("@"),
      end: text.length,
      query: "",
    });
  });

  it("не считает упоминанием склеенный токен до @", () => {
    expect(findMentionDraft("Всеволод@ро", 11)).toBeNull();
  });
});

describe("parseMentionUserIdsFromText", () => {
  it("резолвит латинский handle и кириллицу вокруг", () => {
    const users = [
      { id: "u1", mentionHandle: "ivan" },
      { id: "u2", mentionHandle: "мария" },
    ];
    expect(
      parseMentionUserIdsFromText("Задача для @ivan проверить до вечера", users),
    ).toEqual(["u1"]);
    expect(
      parseMentionUserIdsFromText("Написать @мария про сроки178 от 10.02.2026", users),
    ).toEqual(["u2"]);
  });

  it("без дубликатов и без неизвестных handle", () => {
    const users = [{ id: "a", mentionHandle: "boss" }];
    expect(parseMentionUserIdsFromText("@boss @boss @unknown", users)).toEqual(["a"]);
  });

  it("резолвит по локальной части email, если mentionHandle пустой (как подсказка в чате)", () => {
    const users = [
      {
        id: "uid1",
        mentionHandle: null,
        email: "vsevolodsokolov@example.com",
        displayName: "Всеволод",
      },
    ];
    expect(parseMentionUserIdsFromText("Привет @vsevolodsokolov", users)).toEqual(["uid1"]);
  });

  it("разворачивает общий тег лаборатории в несколько user id", () => {
    const users = [{ id: "x", mentionHandle: "solo" }];
    expect(
      parseMentionUserIdsFromText("Эй @clickpr для производства", users, {
        productionMentionTag: "clickpr",
        productionUserIds: ["prod1", "prod2"],
      }).sort(),
    ).toEqual(["prod1", "prod2"].sort());

    expect(
      parseMentionUserIdsFromText("Эй @clicklab и @solo", users, {
        adminMentionTag: "clicklab",
        adminUserIds: ["adm1", "adm2"],
      }).sort(),
    ).toEqual(["adm1", "adm2", "x"].sort());
  });

  it("несколько личных @ — все; @ClickLab не подменяет личный тег владельца", () => {
    const users = [
      { id: "owner", mentionHandle: "digitaldemon" },
      { id: "zed", mentionHandle: "zedpomaps" },
      { id: "model", mentionHandle: "ModelistD" },
    ];
    expect(
      parseMentionUserIdsFromText(
        "@digitaldemon @zedpomaps проверка",
        users,
      ).sort(),
    ).toEqual(["owner", "zed"].sort());
    expect(
      parseMentionUserIdsFromText(
        "ClickLAB: @digitaldemon @zedpomaps вокруг кириллицы",
        users,
      ).sort(),
    ).toEqual(["owner", "zed"].sort());
    expect(
      parseMentionUserIdsFromText("@ClickLab и @digitaldemon", users, {
        adminMentionTag: "clicklab",
        adminUserIds: ["adm1"],
      }).sort(),
    ).toEqual(["adm1", "owner"].sort());
  });
});
