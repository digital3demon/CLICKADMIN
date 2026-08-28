import { afterEach, describe, expect, it } from "vitest";
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import {
  appointmentSnapsFromCrmTiles,
  clearCrmBoardTilesCacheForTests,
  loadCrmBoardTilesCache,
  mergeCrmBoardTilesCache,
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
};

afterEach(() => {
  clearCrmBoardTilesCacheForTests();
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
