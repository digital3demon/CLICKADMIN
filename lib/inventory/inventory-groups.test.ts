import { describe, expect, it } from "vitest";
import { moveMemberBetweenGroups } from "@/lib/inventory/inventory-groups";

describe("moveMemberBetweenGroups", () => {
  it("из реальной группы в другую — убрать из источника, добавить в назначение", () => {
    expect(
      moveMemberBetweenGroups(["a", "b"], ["c"], "b", false, false),
    ).toEqual({ sourceMemberIds: ["a"], destMemberIds: ["c", "b"] });
  });

  it("из «не сгруппировано» в группу — только добавить", () => {
    expect(
      moveMemberBetweenGroups([], ["c"], "b", true, false),
    ).toEqual({ sourceMemberIds: [], destMemberIds: ["c", "b"] });
  });

  it("в «не сгруппировано» — только убрать из источника", () => {
    expect(
      moveMemberBetweenGroups(["a", "b"], [], "b", false, true),
    ).toEqual({ sourceMemberIds: ["a"], destMemberIds: [] });
  });

  it("между двумя виртуальными или уже на месте — без изменений", () => {
    expect(moveMemberBetweenGroups([], [], "b", true, true)).toBeNull();
    expect(moveMemberBetweenGroups(["a"], ["b"], "b", true, false)).toBeNull();
  });
});
