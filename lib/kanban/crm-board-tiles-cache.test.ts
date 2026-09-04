import { afterEach, describe, expect, it } from "vitest";
import {
  clearPendingKanbanColumnMovesForTests,
  rememberPendingKanbanColumnMove,
} from "@/lib/kanban/pending-column-moves";
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import {
  appointmentSnapsFromCrmTiles,
  clearCrmBoardTilesCacheForTests,
  loadCrmBoardTilesCache,
  mergeCrmBoardTilesCache,
  patchCrmBoardTilesCacheColumn,
  patchCrmBoardTilesCacheTimer,
  patchCrmBoardTilesCacheTrackLane,
  patchCrmBoardTilesCacheBlock,
  saveCrmBoardTilesCache,
} from "@/lib/kanban/crm-board-tiles-cache";

const tile: CrmBoardTile = {
  orderId: "ord-крупышева",
  orderNumber: "2608-391",
  title: "2608-391 Крупышева",
  cardTypeId: "t1",
  cardTypeName: "Сплинт",
  assignees: ["u-юля"],
  participants: [],
  stageDueYmd: "2026-09-01",
  urgent: false,
  blocked: false,
  blockReason: "",
  columnTitle: "К исполнению",
  sortOrder: 1,
  trackLane: "ORTHODONTICS",
  boardId: "kanban_board_orthodontics",
  appointmentDate: "2026-09-01T06:00:00.000Z",
  dueToAdminsAt: null,
  dueToAdminsHasTime: true,
  updatedAt: "2026-08-28T12:00:00.000Z",
  createdAt: "2026-07-29T10:00:00.000Z",
  timerStartedAt: null,
  timerDurationMs: null,
  timerFrozenAt: null,
  timerStartedByUserId: null,
  timerParkedAt: null,
  timerParkedRemainingMs: null,
  checklist: null,
  sourceEmailCount: 2,
};

afterEach(() => {
  clearCrmBoardTilesCacheForTests();
  clearPendingKanbanColumnMovesForTests();
});

describe("crm-board-tiles-cache", () => {
  it("пишет и читает плитку с кириллицей в oid/title", () => {
    saveCrmBoardTilesCache("kanban_board_orthodontics", [tile]);
    expect(loadCrmBoardTilesCache("kanban_board_orthodontics")).toEqual([tile]);
    expect(loadCrmBoardTilesCache("kanban_board_orthopedics")).toEqual([]);
  });

  it("дельта не затирает другие плитки в кэше", () => {
    saveCrmBoardTilesCache("kanban_board_orthodontics", [tile]);
    mergeCrmBoardTilesCache("kanban_board_orthodontics", [
      { ...tile, orderId: "ord-другая", title: "2608-392 Другая", cardTypeName: "Модели" },
    ]);
    const cached = loadCrmBoardTilesCache("kanban_board_orthodontics");
    expect(cached).toHaveLength(2);
    expect(cached.map((t) => t.orderId).sort()).toEqual(["ord-другая", "ord-крупышева"]);
    expect(cached.find((t) => t.orderId === "ord-крупышева")?.cardTypeName).toBe("Сплинт");
  });

  it("pending-перенос не даёт дельте вернуть старую колонку", () => {
    saveCrmBoardTilesCache("kanban_board_orthodontics", [tile]);
    rememberPendingKanbanColumnMove({
      cardId: "ord-крупышева",
      orderId: "ord-крупышева",
      toColumnTitle: "Согласование Жеребцов",
    });
    mergeCrmBoardTilesCache("kanban_board_orthodontics", [
      { ...tile, columnTitle: "К исполнению" },
    ]);
    expect(
      loadCrmBoardTilesCache("kanban_board_orthodontics").find(
        (t) => t.orderId === "ord-крупышева",
      )?.columnTitle,
    ).toBe("Согласование Жеребцов");
    patchCrmBoardTilesCacheColumn("ord-крупышева", "Согласование Жеребцов");
    expect(
      loadCrmBoardTilesCache("kanban_board_orthodontics")[0]?.columnTitle,
    ).toBe("Согласование Жеребцов");
  });

  it("патч дорожки перекладывает плитку на другую доску (кириллица в oid)", () => {
    saveCrmBoardTilesCache("kanban_board_orthodontics", [
      { ...tile, orderId: "наряд-степанов", trackLane: "ORTHODONTICS" },
    ]);
    patchCrmBoardTilesCacheTrackLane("наряд-степанов", "ORTHOPEDICS");
    expect(loadCrmBoardTilesCache("kanban_board_orthodontics")).toEqual([]);
    const dest = loadCrmBoardTilesCache("kanban_board_orthopedics");
    expect(dest).toHaveLength(1);
    expect(dest[0]?.orderId).toBe("наряд-степанов");
    expect(dest[0]?.trackLane).toBe("ORTHOPEDICS");
    expect(dest[0]?.boardId).toBe("kanban_board_orthopedics");
  });

  it("патч таймера в кэше плиток (кириллица в oid)", () => {
    saveCrmBoardTilesCache("kanban_board_orthodontics", [
      { ...tile, orderId: "наряд-остренкова", timerStartedAt: "2026-08-31T10:00:00.000Z" },
    ]);
    patchCrmBoardTilesCacheTimer("наряд-остренкова", {
      timerStartedAt: null,
      timerDurationMs: 1_800_000,
      timerFrozenAt: null,
      timerStartedByUserId: "u-всеволод",
      timerParkedAt: "2026-08-31T12:00:00.000Z",
      timerParkedRemainingMs: 600_000,
    });
    const cached = loadCrmBoardTilesCache("kanban_board_orthodontics")[0];
    expect(cached?.timerStartedAt).toBeNull();
    expect(cached?.timerParkedRemainingMs).toBe(600_000);
  });

  it("патч блокировки в кэше плиток (кириллица в oid)", () => {
    saveCrmBoardTilesCache("kanban_board_orthodontics", [
      {
        ...tile,
        orderId: "наряд-анискина",
        blocked: true,
        blockReason: "Не те данные от Анискиной",
      },
    ]);
    patchCrmBoardTilesCacheBlock("наряд-анискина", {
      blocked: false,
      blockReason: "",
    });
    const cached = loadCrmBoardTilesCache("kanban_board_orthodontics")[0];
    expect(cached?.blocked).toBe(false);
    expect(cached?.blockReason).toBe("");
  });

  it("appointment snaps для Актуального с первого кадра", () => {
    const snaps = appointmentSnapsFromCrmTiles([tile]);
    expect(snaps.get("ord-крупышева")).toEqual({
      orderNumber: "2608-391",
      appointmentDate: "2026-09-01T06:00:00.000Z",
      dueToAdminsAt: null,
      dueToAdminsHasTime: true,
    });
  });
});
