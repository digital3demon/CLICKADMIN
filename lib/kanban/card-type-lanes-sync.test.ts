import { describe, expect, it } from "vitest";
import { defaultAppState } from "@/lib/kanban/model";
import {
  applyKanbanCardTypeLanes,
  defaultSpaceByCardTypeFromLaneSnapshot,
  extractKanbanCardTypeLanes,
  mergeCardTypeLaneSnapshots,
  normalizeKanbanCardTypeLanes,
} from "@/lib/kanban/card-type-lanes-sync";

describe("kanban card type lanes snapshot", () => {
  it("нормализует битый payload и кириллические имена", () => {
    expect(normalizeKanbanCardTypeLanes(null).types).toEqual([]);
    expect(normalizeKanbanCardTypeLanes("x").types).toEqual([]);
    const snap = normalizeKanbanCardTypeLanes({
      version: 1,
      types: [
        { id: "cuid-1", name: "Сплинт", defaultTrackLane: "ORTHOPEDICS" },
        { id: "", name: "ОртоАппараты", defaultTrackLane: "ORTHODONTICS" },
        { id: "skip", name: "X", defaultTrackLane: "NOPE" },
      ],
    });
    expect(snap.types).toEqual([
      { id: "cuid-1", name: "Сплинт", defaultTrackLane: "ORTHOPEDICS" },
      { id: "", name: "ОртоАппараты", defaultTrackLane: "ORTHODONTICS" },
    ]);
  });

  it("пустой incoming не затирает уже сохранённые пространства", () => {
    const saved = {
      version: 1 as const,
      types: [
        { id: "cuid-1", name: "Сплинт", defaultTrackLane: "ORTHOPEDICS" as const },
      ],
    };
    expect(mergeCardTypeLaneSnapshots({ version: 1, types: [] }, saved)).toEqual(
      saved,
    );
    expect(mergeCardTypeLaneSnapshots(null, saved)).toEqual(saved);
  });

  it("incoming перекрывает fallback по id, не теряя остальные типы", () => {
    const merged = mergeCardTypeLaneSnapshots(
      {
        version: 1,
        types: [
          { id: "cuid-1", name: "Сплинт", defaultTrackLane: "TEST" },
        ],
      },
      {
        version: 1,
        types: [
          { id: "cuid-1", name: "Сплинт", defaultTrackLane: "ORTHOPEDICS" },
          { id: "cuid-2", name: "ОртоАппараты", defaultTrackLane: "ORTHODONTICS" },
        ],
      },
    );
    expect(merged.types).toEqual([
      { id: "cuid-1", name: "Сплинт", defaultTrackLane: "TEST" },
      { id: "cuid-2", name: "ОртоАппараты", defaultTrackLane: "ORTHODONTICS" },
    ]);
  });

  it("extract / apply сохраняет пространство после смены id", () => {
    const state = defaultAppState();
    const board = state.boards[0]!;
    board.cardTypes = [
      {
        id: "kt_spl",
        name: "Сплинт",
        color: "#3b82f6",
        sortOrder: 90,
        defaultTrackLane: "ORTHOPEDICS",
      },
    ];
    const snap = extractKanbanCardTypeLanes(state);
    expect(snap.types[0]?.defaultTrackLane).toBe("ORTHOPEDICS");

    board.cardTypes = [
      {
        id: "cuid-from-erp",
        name: "Сплинт",
        color: "#3b82f6",
        sortOrder: 90,
      },
    ];
    const applied = applyKanbanCardTypeLanes(state, snap);
    expect(applied.boards[0]!.cardTypes[0]!.defaultTrackLane).toBe(
      "ORTHOPEDICS",
    );
  });

  it("карта для префлайта: id и нормализованное имя", () => {
    const map = defaultSpaceByCardTypeFromLaneSnapshot({
      version: 1,
      types: [
        { id: "cuid-1", name: "ОртоАппараты х Хирургия", defaultTrackLane: "ORTHODONTICS" },
      ],
    });
    expect(map["cuid-1"]).toBe("ORTHODONTICS");
    expect(map["name:ортоаппараты х хирургия"]).toBe("ORTHODONTICS");
  });
});
