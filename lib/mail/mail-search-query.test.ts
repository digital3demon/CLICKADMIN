import { describe, expect, it } from "vitest";
import {
  mailSearchTokens,
  mailSearchWhere,
  normalizeMailSearchQuery,
} from "@/lib/mail/mail-search-query";

describe("normalizeMailSearchQuery", () => {
  it("схлопывает пробелы", () => {
    expect(normalizeMailSearchQuery("  федорова   губин  ")).toBe("федорова губин");
  });
});

describe("mailSearchTokens", () => {
  it("делит по пробелам (кириллица)", () => {
    expect(mailSearchTokens("федорова губин")).toEqual(["федорова", "губин"]);
  });

  it("пустой ввод → []", () => {
    expect(mailSearchTokens("")).toEqual([]);
    expect(mailSearchTokens("   ")).toEqual([]);
  });
});

describe("mailSearchWhere", () => {
  it("одно слово — OR по полям", () => {
    expect(mailSearchWhere("федорова")).toEqual({
      OR: [
        { subject: { contains: "федорова", mode: "insensitive" } },
        { preview: { contains: "федорова", mode: "insensitive" } },
        { fromName: { contains: "федорова", mode: "insensitive" } },
        { fromAddress: { contains: "федорова", mode: "insensitive" } },
      ],
    });
  });

  it("комбинация — AND токенов (каждое слово в любом поле)", () => {
    const where = mailSearchWhere("федорова губин");
    expect(where).toEqual({
      AND: [
        {
          OR: [
            { subject: { contains: "федорова", mode: "insensitive" } },
            { preview: { contains: "федорова", mode: "insensitive" } },
            { fromName: { contains: "федорова", mode: "insensitive" } },
            { fromAddress: { contains: "федорова", mode: "insensitive" } },
          ],
        },
        {
          OR: [
            { subject: { contains: "губин", mode: "insensitive" } },
            { preview: { contains: "губин", mode: "insensitive" } },
            { fromName: { contains: "губин", mode: "insensitive" } },
            { fromAddress: { contains: "губин", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("без запроса — undefined", () => {
    expect(mailSearchWhere(null)).toBeUndefined();
  });
});
