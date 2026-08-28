import { describe, expect, it } from "vitest";
import {
  KANBAN_HYDRATE_LANES,
  linkedOrdersApiUrl,
  parseKanbanHydrateLanesParam,
} from "@/lib/kanban/linked-orders-hydrate";

describe("parseKanbanHydrateLanesParam", () => {
  it("режет мусор и дубли, оставляет известные дорожки", () => {
    expect(
      parseKanbanHydrateLanesParam("orthodontics,ORTHOPEDICS,нет,ORTHODONTICS"),
    ).toEqual(["ORTHODONTICS", "ORTHOPEDICS"]);
  });

  it("пустой ввод — нет дорожек (не подменять recent-200 молча)", () => {
    expect(parseKanbanHydrateLanesParam("")).toEqual([]);
    expect(parseKanbanHydrateLanesParam(null)).toEqual([]);
  });
});

describe("linkedOrdersApiUrl", () => {
  it("без поиска шлёт lanes — доска не ждёт q", () => {
    expect(
      linkedOrdersApiUrl([], "", { lanes: KANBAN_HYDRATE_LANES }),
    ).toBe("/api/kanban/linked-orders?lanes=ORTHOPEDICS%2CORTHODONTICS%2CTEST");
  });

  it("поиск не смешивает lanes: q — единственный текстовый путь", () => {
    expect(
      linkedOrdersApiUrl(["oid-1"], "степа", { lanes: KANBAN_HYDRATE_LANES }),
    ).toBe("/api/kanban/linked-orders?ids=oid-1&q=%D1%81%D1%82%D0%B5%D0%BF%D0%B0");
  });
});
