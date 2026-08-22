import { describe, expect, it } from "vitest";
import {
  collapsedColsAttr,
  collapsedRunAtStart,
  collapsedRunsAfter,
  firstVisibleColId,
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

describe("collapsedRunsAfter", () => {
  it("тип сразу после статуса — точка у статуса", () => {
    expect(collapsedRunsAfter("status", ["type"])).toEqual(["type"]);
    expect(collapsedRunsAfter("type", ["type"])).toEqual([]);
    expect(collapsedRunsAfter("print", ["type"])).toEqual([]);
  });

  it("кириллица в соседних подписях не нужна — режем по id", () => {
    expect(collapsedRunsAfter("status", ["type", "number"])).toEqual([
      "type",
      "number",
    ]);
  });
});

describe("collapsedRunAtStart", () => {
  it("чат слева — точка у первого видимого", () => {
    expect(collapsedRunAtStart(["chat"])).toEqual(["chat"]);
    expect(firstVisibleColId(["chat"])).toBe("print");
    expect(collapsedRunAtStart(["type"])).toEqual([]);
  });
});
