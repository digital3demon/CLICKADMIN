import { describe, expect, it } from "vitest";
import {
  collectCardTypeDefaultLanes,
  defaultTrackLaneForCardTypeName,
  mergeCardTypeDefsKeepingLanes,
  pickPreservedCardTypeLane,
} from "@/lib/kanban/card-type-default-lane";

describe("defaultTrackLaneForCardTypeName", () => {
  it("орто-типы — ортодонтия, кириллица до и после", () => {
    expect(defaultTrackLaneForCardTypeName("ОртоАппараты")).toBe("ORTHODONTICS");
    expect(defaultTrackLaneForCardTypeName("ОртоАппараты х Хирургия")).toBe(
      "ORTHODONTICS",
    );
    expect(defaultTrackLaneForCardTypeName("МиоСплинт")).toBe("ORTHODONTICS");
  });

  it("сплинт / постоянные / моделировка — ортопедия", () => {
    expect(defaultTrackLaneForCardTypeName("Сплинт")).toBe("ORTHOPEDICS");
    expect(defaultTrackLaneForCardTypeName("Постоянные")).toBe("ORTHOPEDICS");
    expect(defaultTrackLaneForCardTypeName("Моделировка")).toBe("ORTHOPEDICS");
  });
});

describe("pickPreservedCardTypeLane", () => {
  it("после смены id сохраняет пространство по имени", () => {
    const preserved = collectCardTypeDefaultLanes([
      { id: "kt_spl", name: "Сплинт", defaultTrackLane: "ORTHOPEDICS" },
    ]);
    expect(
      pickPreservedCardTypeLane(
        { id: "cuid-new", name: "Сплинт" },
        preserved,
      ),
    ).toBe("ORTHOPEDICS");
  });

  it("явное пространство важнее эвристики", () => {
    const preserved = collectCardTypeDefaultLanes([
      { id: "x", name: "ОртоАппараты", defaultTrackLane: "ORTHOPEDICS" },
    ]);
    expect(
      pickPreservedCardTypeLane(
        { id: "x", name: "ОртоАппараты" },
        preserved,
      ),
    ).toBe("ORTHOPEDICS");
  });
});

describe("mergeCardTypeDefsKeepingLanes", () => {
  it("берёт пространство из local, если remote его потерял", () => {
    const merged = mergeCardTypeDefsKeepingLanes(
      [{ id: "cuid-1", name: "Сплинт" }],
      [{ id: "kt_spl", name: "Сплинт", defaultTrackLane: "ORTHOPEDICS" }],
    );
    expect(merged[0]?.defaultTrackLane).toBe("ORTHOPEDICS");
  });

  it("не затирает явное пространство remote локальной эвристикой", () => {
    const merged = mergeCardTypeDefsKeepingLanes(
      [{ id: "cuid-1", name: "ОртоАппараты", defaultTrackLane: "TEST" }],
      [{ id: "cuid-1", name: "ОртоАппараты", defaultTrackLane: "ORTHODONTICS" }],
    );
    expect(merged[0]?.defaultTrackLane).toBe("TEST");
  });

  it("локальная «Моделировка» не пропадает, если в remote только «Модели»", () => {
    const merged = mergeCardTypeDefsKeepingLanes(
      [{ id: "cuid-модели", name: "Модели", defaultTrackLane: "ORTHOPEDICS" }],
      [{ id: "kt_local", name: "Моделировка", defaultTrackLane: "ORTHOPEDICS" }],
    );
    expect(merged.some((t) => t.name === "Модели")).toBe(true);
    expect(merged.some((t) => t.name === "Моделировка")).toBe(true);
  });
});
