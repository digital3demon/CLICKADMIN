import { describe, expect, it } from "vitest";
import {
  columnTitlesBySpaceFromTenantKanbanState,
  defaultColumnTitleBySpaceFromTenantKanbanState,
  listKanbanColumnTitlesForPreflight,
  pickDefaultKanbanColumnTitle,
  resolvePreferredSpaceForCardType,
  withPreflightStopColumn,
} from "@/components/orders/new-order-form/KaitenPreflightModal";
import {
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";

describe("resolvePreferredSpaceForCardType", () => {
  const both = ["ORTHOPEDICS", "ORTHODONTICS"] as const;

  it("prefers map by kaiten type id", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "cuid-1",
        typeName: "Постоянные",
        defaultSpaceByCardType: { "cuid-1": "ORTHODONTICS" },
        availableSpaces: both,
      }),
    ).toBe("ORTHODONTICS");
  });

  it("falls back to map by normalized name when ids differ (CRM vs Kaiten)", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "kaiten-cuid",
        typeName: "Постоянные",
        defaultSpaceByCardType: {
          "crm-local-id": "ORTHOPEDICS",
          "name:постоянные": "ORTHOPEDICS",
        },
        availableSpaces: both,
      }),
    ).toBe("ORTHOPEDICS");
  });

  it("uses orthodontics heuristic for ортоаппараты", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "x",
        typeName: "ОртоАппараты",
        defaultSpaceByCardType: {},
        availableSpaces: both,
      }),
    ).toBe("ORTHODONTICS");
  });

  it("switches to orthodontics even if mirrored board map stuck on orthopedics", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "cuid-orto",
        typeName: "ОртоАппараты",
        defaultSpaceByCardType: {
          "cuid-orto": "ORTHOPEDICS",
          "name:ортоаппараты": "ORTHOPEDICS",
        },
        availableSpaces: both,
      }),
    ).toBe("ORTHODONTICS");
  });

  it("does not inherit orthodontics board just because types are mirrored there", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "cuid-splint",
        typeName: "Сплинт",
        defaultSpaceByCardType: {
          "name:сплинт": "ORTHOPEDICS",
        },
        availableSpaces: both,
      }),
    ).toBe("ORTHOPEDICS");
  });

  it("defaults to orthopedics when available", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "x",
        typeName: "Постоянные",
        defaultSpaceByCardType: {},
        availableSpaces: both,
      }),
    ).toBe("ORTHOPEDICS");
  });

  it("ignores preferred lane not in available spaces", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "x",
        typeName: "Постоянные",
        defaultSpaceByCardType: { "name:постоянные": "TEST" },
        availableSpaces: ["ORTHOPEDICS"],
      }),
    ).toBe("ORTHOPEDICS");
  });
});

describe("listKanbanColumnTitlesForPreflight", () => {
  it("берёт кириллические столбцы и канонизирует СТОП", () => {
    expect(
      listKanbanColumnTitlesForPreflight([
        { title: "К исполнению" },
        { title: "  Производство  " },
        { title: "СТОП" },
        { title: "К исполнению" },
        { title: "" },
      ]),
    ).toEqual(["К исполнению", "Производство", "СТОП"]);
    expect(withPreflightStopColumn(["К исполнению"])).toEqual([
      "К исполнению",
      "СТОП",
    ]);
  });

  it("столбцы с доски ортопедии, кириллица вокруг", () => {
    const bySpace = columnTitlesBySpaceFromTenantKanbanState({
      boards: [
        {
          id: KANBAN_BOARD_ORTHOPEDICS_ID,
          columns: [
            { title: "На скан" },
            { title: "К исполнению" },
            { title: "СТОП" },
          ],
        },
        {
          id: KANBAN_BOARD_ORTHODONTICS_ID,
          columns: [{ title: "Согласование" }],
        },
      ],
    });
    expect(bySpace.ORTHOPEDICS).toEqual(["На скан", "К исполнению", "СТОП"]);
    expect(bySpace.ORTHODONTICS).toEqual(["Согласование"]);
    expect(pickDefaultKanbanColumnTitle(bySpace.ORTHOPEDICS ?? [])).toBe(
      "К исполнению",
    );
  });

  it("столбец по умолчанию с доски, кириллица вокруг; СТОП из конфига игнорируем", () => {
    const bySpace = defaultColumnTitleBySpaceFromTenantKanbanState({
      boards: [
        {
          id: KANBAN_BOARD_ORTHOPEDICS_ID,
          defaultNewCardColumnTitle: "  Производство  ",
        },
        {
          id: KANBAN_BOARD_ORTHODONTICS_ID,
          defaultNewCardColumnTitle: "  Стоп  ",
        },
      ],
    });
    expect(bySpace.ORTHOPEDICS).toBe("Производство");
    expect(bySpace.ORTHODONTICS).toBeUndefined();
    expect(
      pickDefaultKanbanColumnTitle(
        ["К исполнению", "Производство", "СТОП"],
        bySpace.ORTHOPEDICS,
      ),
    ).toBe("Производство");
    expect(
      pickDefaultKanbanColumnTitle(["К исполнению", "СТОП"], "СТОП"),
    ).toBe("К исполнению");
  });
});
