import { describe, expect, it } from "vitest";
import { parseMentionUserIdsFromText } from "@/lib/kanban-comment-mentions";

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
});
