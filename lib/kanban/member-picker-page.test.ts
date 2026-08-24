import { describe, expect, it } from "vitest";
import {
  KANBAN_MEMBER_PICKER_PAGE_SIZE,
  sliceKanbanMemberPickerPage,
  splitPickerIntoColumns,
} from "./member-picker-page";

describe("sliceKanbanMemberPickerPage", () => {
  it("одна страница до 45 человек, в том числе кириллица вокруг списка", () => {
    const names = ["Арина", "Илья", "Оля"];
    const sliced = sliceKanbanMemberPickerPage(names, 0);
    expect(sliced.pageCount).toBe(1);
    expect(sliced.items).toEqual(names);
  });

  it("46-й человек открывает вторую страницу", () => {
    const items = Array.from({ length: 46 }, (_, i) => `u${i}`);
    expect(KANBAN_MEMBER_PICKER_PAGE_SIZE).toBe(45);
    const p0 = sliceKanbanMemberPickerPage(items, 0);
    const p1 = sliceKanbanMemberPickerPage(items, 1);
    expect(p0.pageCount).toBe(2);
    expect(p0.items).toHaveLength(45);
    expect(p1.items).toEqual(["u45"]);
  });

  it("страница за пределами сжимается", () => {
    expect(sliceKanbanMemberPickerPage(["a"], 9).page).toBe(0);
  });
});

describe("splitPickerIntoColumns", () => {
  it("45 человек → по 15 в столбец", () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    const [a, b, c] = splitPickerIntoColumns(items);
    expect(a).toHaveLength(15);
    expect(b).toHaveLength(15);
    expect(c).toHaveLength(15);
  });
});
