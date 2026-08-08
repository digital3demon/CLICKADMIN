import { describe, expect, it } from "vitest";
import { crmKanbanLinkedCardId } from "@/lib/kanban-order-card-url";
import type { KanbanBoard } from "@/lib/kanban/types";
import {
  DEFAULT_PUBLIC_HUB_TIMELINE,
  normalizePublicHubTimeline,
} from "@/lib/sticker-public-hub-timeline";
import {
  milestonesFromKanbanActivity,
  milestonesFromRevisionColumns,
} from "@/lib/sticker-public-milestones";
import { resolvePublicHubTimeline } from "@/lib/resolve-public-hub-timeline";

const sampleBoards: KanbanBoard[] = [
  {
    id: "b1",
    title: "Ортопедия",
    columns: [
      { id: "c1", title: "Согласование", cards: [] },
      { id: "c2", title: "Производство", cards: [] },
      { id: "c3", title: "Сборка", cards: [] },
      { id: "c4", title: "Обработка", cards: [] },
      { id: "c5", title: "Сдана админам", cards: [] },
    ],
    users: [],
    archivedCards: [],
    stoppedCards: [],
    rules: [],
    automations: [],
  } as KanbanBoard,
];

describe("normalizePublicHubTimeline", () => {
  it("возвращает дефолт при пустом вводе", () => {
    const n = normalizePublicHubTimeline(null);
    expect(n.rows).toHaveLength(5);
    expect(n.rows[0]?.label).toBe("Поступление в лабораторию");
  });

  it("возвращает дефолт при пустом массиве строк", () => {
    expect(normalizePublicHubTimeline({ rows: [] }).rows).toHaveLength(5);
  });
});

describe("resolvePublicHubTimeline — дефолтный пресет", () => {
  const activity = [
    { at: "2026-06-22T12:00:00.000Z", text: "Перемещена в «Обработка»" },
    { at: "2026-06-20T10:00:00.000Z", text: "Перемещена в «Сборка»" },
    { at: "2026-06-18T09:00:00.000Z", text: "Перемещена в «Производство»" },
    { at: "2026-06-17T08:00:00.000Z", text: "Перемещена в «Согласование»" },
    { at: "2026-06-25T14:00:00.000Z", text: "Перемещена в «Сдана админам»" },
  ];

  const revisionColumns = [
    { at: new Date("2026-06-10T08:00:00Z"), column: "Согласование" },
    { at: new Date("2026-06-13T10:28:00Z"), column: "Производство" },
    { at: new Date("2026-06-20T12:00:00Z"), column: "Сборка" },
    { at: new Date("2026-06-22T12:13:00Z"), column: "Обработка" },
  ];

  it("совпадает с milestonesFromKanbanActivity для согласования и производства", () => {
    const legacy = milestonesFromKanbanActivity(activity);
    const rows = resolvePublicHubTimeline({
      config: DEFAULT_PUBLIC_HUB_TIMELINE,
      order: {
        createdAt: "2026-06-01T08:00:00.000Z",
        workReceivedAt: null,
      },
      kanbanActivity: activity,
      revisionColumnRows: [],
      revisionFieldRows: [],
      kanbanBoards: sampleBoards,
    });
    const agreed = rows.find((r) => r.id === "row-agreed");
    const produced = rows.find((r) => r.id === "row-produced");
    expect(agreed?.at).toBe(legacy.agreedAt);
    expect(produced?.at).toBe(legacy.producedAt);
  });

  it("совпадает с milestonesFromRevisionColumns", () => {
    const legacy = milestonesFromRevisionColumns(revisionColumns);
    const rows = resolvePublicHubTimeline({
      config: DEFAULT_PUBLIC_HUB_TIMELINE,
      order: {
        createdAt: "2026-06-01T08:00:00.000Z",
        workReceivedAt: "2026-06-02T09:00:00.000Z",
      },
      kanbanActivity: [],
      revisionColumnRows: revisionColumns,
      revisionFieldRows: [],
    });
    expect(rows.find((r) => r.id === "row-agreed")?.at).toBe(legacy.agreedAt);
    expect(rows.find((r) => r.id === "row-produced")?.at).toBe(legacy.producedAt);
  });

  it("fallback поступления на createdAt с note", () => {
    const rows = resolvePublicHubTimeline({
      order: {
        createdAt: "2026-06-01T08:00:00.000Z",
        workReceivedAt: null,
      },
      kanbanActivity: [],
      revisionColumnRows: [],
      revisionFieldRows: [],
    });
    const received = rows.find((r) => r.id === "row-received");
    expect(received?.at).toBe("2026-06-01T08:00:00.000Z");
    expect(received?.note).toContain("оформления");
  });

  it("первый вход в Производство без записи «из Согласования»", () => {
    const rows = resolvePublicHubTimeline({
      config: DEFAULT_PUBLIC_HUB_TIMELINE,
      order: {
        createdAt: "2026-06-01T08:00:00.000Z",
        workReceivedAt: null,
      },
      kanbanActivity: [
        { at: "2026-06-25T14:00:00.000Z", text: "Перемещена в «Сдана админам»" },
        { at: "2026-06-18T09:00:00.000Z", text: "Перемещена в «Производство»" },
      ],
      revisionColumnRows: [],
      revisionFieldRows: [],
    });
    expect(rows.find((r) => r.id === "row-agreed")?.at).toBe(
      "2026-06-18T09:00:00.000Z",
    );
    expect(rows.find((r) => r.id === "row-produced")?.at).toBe(
      "2026-06-25T14:00:00.000Z",
    );
    expect(rows.find((r) => r.id === "row-ready")?.at).toBe(
      "2026-06-25T14:00:00.000Z",
    );
  });

  it("фиксирует вход в «Сдана админам»", () => {
    const rows = resolvePublicHubTimeline({
      config: DEFAULT_PUBLIC_HUB_TIMELINE,
      order: {
        createdAt: "2026-06-01T08:00:00.000Z",
        workReceivedAt: null,
      },
      kanbanActivity: activity,
      revisionColumnRows: [],
      revisionFieldRows: [],
    });
    expect(rows.find((r) => r.id === "row-ready")?.at).toBe("2026-06-25T14:00:00.000Z");
  });
});

describe("resolvePublicHubTimeline — условия", () => {
  it("kanban_move из A в любую", () => {
    const rows = resolvePublicHubTimeline({
      config: {
        rows: [
          {
            id: "m1",
            label: "Тест",
            condition: {
              type: "kanban_move",
              from: { mode: "column", boardId: "", columnId: "", title: "Сборка" },
              to: { mode: "any" },
            },
          },
        ],
      },
      order: { createdAt: "2026-01-01T00:00:00.000Z", workReceivedAt: null },
      kanbanActivity: [
        { at: "2026-06-22T12:00:00.000Z", text: "Перемещена в «Обработка»" },
        { at: "2026-06-20T10:00:00.000Z", text: "Перемещена в «Сборка»" },
      ],
      revisionColumnRows: [],
      revisionFieldRows: [],
    });
    expect(rows[0]?.at).toBe("2026-06-22T12:00:00.000Z");
  });

  it("kanban_move из A в следующую", () => {
    const rows = resolvePublicHubTimeline({
      config: {
        rows: [
          {
            id: "m2",
            label: "Следующая",
            condition: {
              type: "kanban_move",
              from: { mode: "column", boardId: "", columnId: "", title: "Согласование" },
              to: { mode: "next" },
            },
          },
        ],
      },
      order: { createdAt: "2026-01-01T00:00:00.000Z", workReceivedAt: null },
      kanbanActivity: [
        { at: "2026-06-18T09:00:00.000Z", text: "Перемещена в «Производство»" },
        { at: "2026-06-17T08:00:00.000Z", text: "Перемещена в «Согласование»" },
      ],
      revisionColumnRows: [],
      revisionFieldRows: [],
      kanbanBoards: sampleBoards,
    });
    expect(rows[0]?.at).toBe("2026-06-18T09:00:00.000Z");
  });

  it("kanban_blocked", () => {
    const rows = resolvePublicHubTimeline({
      config: {
        rows: [
          {
            id: "blk",
            label: "Стоп",
            condition: { type: "kanban_blocked" },
          },
        ],
      },
      order: { createdAt: "2026-01-01T00:00:00.000Z", workReceivedAt: null },
      kanbanActivity: [
        { at: "2026-06-19T11:00:00.000Z", text: "Карточка заблокирована: ждём скан" },
      ],
      revisionColumnRows: [],
      revisionFieldRows: [],
    });
    expect(rows[0]?.at).toBe("2026-06-19T11:00:00.000Z");
  });

  it("revision_field_changed — срочность", () => {
    const rows = resolvePublicHubTimeline({
      config: {
        rows: [
          {
            id: "urg",
            label: "Срочно",
            condition: { type: "revision_field_changed", field: "isUrgent" },
          },
        ],
      },
      order: { createdAt: "2026-01-01T00:00:00.000Z", workReceivedAt: null },
      kanbanActivity: [],
      revisionColumnRows: [],
      revisionFieldRows: [
        { at: new Date("2026-06-10T08:00:00Z"), isUrgent: false },
        { at: new Date("2026-06-11T09:00:00Z"), isUrgent: true },
      ],
    });
    expect(rows[0]?.at).toBe("2026-06-11T09:00:00.000Z");
  });

  it("кириллица в «Перемещена в «Согласование»»", () => {
    const rows = resolvePublicHubTimeline({
      config: {
        rows: [
          {
            id: "enter",
            label: "В согласование",
            condition: {
              type: "kanban_enter",
              column: { mode: "column", boardId: "", columnId: "", title: "Согласование" },
            },
          },
        ],
      },
      order: { createdAt: "2026-01-01T00:00:00.000Z", workReceivedAt: null },
      kanbanActivity: [
        { at: "2026-06-17T08:00:00.000Z", text: "Перемещена в «Согласование»" },
      ],
      revisionColumnRows: [],
      revisionFieldRows: [],
    });
    expect(rows[0]?.at).toBe("2026-06-17T08:00:00.000Z");
  });
});

describe("milestonesFromLinkedOrderKanbanState regression", () => {
  it("читает журнал карточки на доске", async () => {
    const { milestonesFromLinkedOrderKanbanState } = await import(
      "@/lib/kanban-tenant-state-snippet-for-order"
    );
    const orderId = "ord-milestone";
    const cardId = crmKanbanLinkedCardId(orderId);
    const raw = {
      boards: [
        {
          id: "b1",
          title: "Ортопедия",
          columns: [
            {
              id: "c1",
              title: "Колонка",
              cards: [
                {
                  id: cardId,
                  linkedOrderId: orderId,
                  activity: [
                    { at: "2026-06-22T12:13:00.000Z", text: "Перемещена в «Обработка»" },
                    { at: "2026-06-20T10:00:00.000Z", text: "Перемещена в «Сборка»" },
                    { at: "2026-06-13T10:28:00.000Z", text: "Перемещена в «Производство»" },
                    { at: "2026-06-10T08:00:00.000Z", text: "Перемещена в «Согласование»" },
                  ],
                },
              ],
            },
          ],
          users: [],
          archivedCards: [],
        },
      ],
    };
    const m = milestonesFromLinkedOrderKanbanState(raw, orderId);
    expect(m.agreedAt).toBe("2026-06-13T10:28:00.000Z");
    expect(m.producedAt).toBe("2026-06-22T12:13:00.000Z");
  });
});
