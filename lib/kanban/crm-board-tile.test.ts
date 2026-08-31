import { describe, expect, it } from "vitest";
import { KANBAN_BOARD_ORTHODONTICS_ID } from "@/lib/kanban/model";
import {
  buildCrmBoardTileTitle,
  crmBoardTileFromOrderRow,
  crmMyTilesMatchesUser,
  kanbanBoardIdFromTrackLane,
  normalizeCrmUserIds,
  trackLaneForKanbanBoardId,
} from "@/lib/kanban/crm-board-tile";

describe("crm-board-tile", () => {
  it("нормализует людей и кладёт ортодонтию на свою доску", () => {
    expect(normalizeCrmUserIds([" u-юля ", "", "u-юля", "u-саша"])).toEqual([
      "u-юля",
      "u-саша",
    ]);
    expect(trackLaneForKanbanBoardId(KANBAN_BOARD_ORTHODONTICS_ID)).toBe(
      "ORTHODONTICS",
    );
    expect(kanbanBoardIdFromTrackLane("ORTHODONTICS")).toBe(
      KANBAN_BOARD_ORTHODONTICS_ID,
    );
  });

  it("заголовок с кириллицей до и после номера", () => {
    expect(
      buildCrmBoardTileTitle({
        orderNumber: "2607-299",
        patientName: "Степанов А.В.",
        doctorFullName: "Жевлаков А.",
        titleLabel: "ХШ",
      }),
    ).toContain("2607-299");
    expect(
      buildCrmBoardTileTitle({
        orderNumber: "2607-299",
        patientName: "Степанов",
        doctorFullName: "Жевлаков",
        titleMirror: "2607-299 Степанов А.В. Жевлаков А. ХШ",
      }),
    ).toBe("2607-299 Степанов А.В. Жевлаков А. ХШ");
  });

  it("плитка без описания и файлов — только живые поля доски", () => {
    const tile = crmBoardTileFromOrderRow({
      id: "ord-1",
      orderNumber: "2608-001",
      patientName: "Иванов",
      doctorFullName: "Петров",
      kaitenCardTypeId: "t1",
      kaitenCardTitleLabel: null,
      kaitenCardTitleMirror: null,
      kanbanAssigneeIds: ["u-я"],
      kanbanParticipantIds: [],
      kanbanStageDueYmd: "2026-09-01",
      isUrgent: true,
      kaitenBlocked: false,
      kaitenBlockReason: null,
      kaitenColumnTitle: "К исполнению",
      kaitenCardSortOrder: 3,
      kaitenTrackLane: "ORTHODONTICS",
      appointmentDate: "2026-09-02T06:00:00.000Z",
      dueToAdminsAt: null,
      kaitenAdminDueHasTime: true,
      updatedAt: "2026-08-28T10:00:00.000Z",
      createdAt: "2026-07-29T10:00:00.000Z",
    });
    expect(tile.boardId).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
    expect(tile.createdAt).toBe("2026-07-29T10:00:00.000Z");
    expect(tile.cardTypeId).toBe("t1");
    expect(tile.assignees).toEqual(["u-я"]);
    expect(tile.stageDueYmd).toBe("2026-09-01");
    expect(tile).not.toHaveProperty("description");
    expect(tile).not.toHaveProperty("files");
    expect(tile.checklist).toBeNull();
    expect(tile.sourceEmailCount).toBe(0);
    expect(tile.timerStartedByUserId).toBeNull();
  });

  it("считает письма наряда для иконки почты, кириллица в id", () => {
    const tile = crmBoardTileFromOrderRow({
      id: "наряд-юля",
      orderNumber: "2608-002",
      patientName: "Тындик",
      doctorFullName: "Жевлаков",
      kaitenCardTypeId: null,
      kaitenCardTitleLabel: null,
      kaitenCardTitleMirror: null,
      isUrgent: false,
      kaitenBlocked: false,
      kaitenBlockReason: null,
      kaitenColumnTitle: "К исполнению",
      kaitenCardSortOrder: null,
      kaitenTrackLane: "ORTHOPEDICS",
      appointmentDate: null,
      dueToAdminsAt: null,
      kaitenAdminDueHasTime: true,
      updatedAt: "2026-08-28T10:00:00.000Z",
      _count: { sourceEmailLinks: 3 },
    });
    expect(tile.sourceEmailCount).toBe(3);
  });

  it("кладёт снимок снятого таймера с кириллицей в oid", () => {
    const tile = crmBoardTileFromOrderRow({
      id: "наряд-остренкова",
      orderNumber: "2608-078",
      patientName: "Остренкова",
      doctorFullName: "Енькова",
      kaitenCardTypeId: null,
      kaitenCardTitleLabel: null,
      kaitenCardTitleMirror: null,
      isUrgent: false,
      kaitenBlocked: false,
      kaitenBlockReason: null,
      kaitenColumnTitle: "Производство",
      kaitenCardSortOrder: null,
      kaitenTrackLane: "ORTHOPEDICS",
      appointmentDate: null,
      dueToAdminsAt: null,
      kaitenAdminDueHasTime: true,
      updatedAt: "2026-08-31T12:00:00.000Z",
      kanbanTimerParkedAt: "2026-08-31T12:00:00.000Z",
      kanbanTimerParkedRemainingMs: 600_000,
    });
    expect(tile.timerParkedAt).toBe("2026-08-31T12:00:00.000Z");
    expect(tile.timerParkedRemainingMs).toBe(600_000);
  });

  it("кладёт автора таймера с кириллицей в id", () => {
    const tile = crmBoardTileFromOrderRow({
      id: "наряд-пехконен",
      orderNumber: "2607-438",
      patientName: "Пехконен",
      doctorFullName: "Енькова",
      kaitenCardTypeId: null,
      kaitenCardTitleLabel: null,
      kaitenCardTitleMirror: null,
      isUrgent: false,
      kaitenBlocked: false,
      kaitenBlockReason: null,
      kaitenColumnTitle: "Согласование",
      kaitenCardSortOrder: null,
      kaitenTrackLane: "ORTHOPEDICS",
      appointmentDate: null,
      dueToAdminsAt: null,
      kaitenAdminDueHasTime: true,
      updatedAt: "2026-08-31T10:00:00.000Z",
      kanbanTimerStartedByUserId: "u-всеволод",
    });
    expect(tile.timerStartedByUserId).toBe("u-всеволод");
  });

  it("Мои / Ответственный — SQL по людям, не скан всех досок", () => {
    expect(
      crmMyTilesMatchesUser(
        { assignees: ["u-я"], participants: [] },
        "u-я",
        "my",
      ),
    ).toBe(true);
    expect(
      crmMyTilesMatchesUser(
        { assignees: [], participants: ["u-я"] },
        "u-я",
        "my",
      ),
    ).toBe(true);
    expect(
      crmMyTilesMatchesUser(
        { assignees: [], participants: ["u-я"] },
        "u-я",
        "distribute",
      ),
    ).toBe(false);
    expect(
      crmMyTilesMatchesUser(
        { assignees: ["u-чужой"], participants: ["u-чужой"] },
        "u-я",
        "my",
      ),
    ).toBe(false);
  });
});
