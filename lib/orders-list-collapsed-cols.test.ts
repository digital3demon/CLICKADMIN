import { describe, expect, it } from "vitest";
import {
  collapsedColsAttr,
  parseCollapsedColIds,
  toggleCollapsedColId,
} from "@/lib/orders-list-collapsed-cols";

describe("parseCollapsedColIds", () => {
  it("пустой ввод", () => {
    expect(parseCollapsedColIds(null)).toEqual([]);
    expect(parseCollapsedColIds("")).toEqual([]);
    expect(parseCollapsedColIds({})).toEqual([]);
  });

  it("кириллица вокруг валидных id — не ломает список", () => {
    expect(
      parseCollapsedColIds({
        v: 1,
        collapsed: ["тип", "status", "type", "status"],
      }),
    ).toEqual(["status", "type"]);
  });

  it("массив строк", () => {
    expect(parseCollapsedColIds(["address", "nope", "lab"])).toEqual([
      "address",
      "lab",
    ]);
  });
});

describe("toggleCollapsedColId", () => {
  it("сворачивает и разворачивает", () => {
    expect(toggleCollapsedColId([], "type")).toEqual(["type"]);
    expect(toggleCollapsedColId(["type", "status"], "type")).toEqual(["status"]);
  });
});

describe("collapsedColsAttr", () => {
  it("пробел для CSS ~=", () => {
    expect(collapsedColsAttr(["status", "type"])).toBe("status type");
  });
});
