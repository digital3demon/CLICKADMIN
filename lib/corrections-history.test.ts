import { describe, expect, it } from "vitest";
import {
  buildCorrectionHistoryStatusTimeline,
  formatCorrectionHistoryAuthorDetail,
  formatCorrectionHistoryDecision,
  mergeCorrectionHistoryRows,
  ordersHistoryHref,
  parseOrdersHistoryTab,
  PROSTHETICS_ARRIVED_STATUS_LABEL,
} from "./corrections-history";

describe("parseOrdersHistoryTab", () => {
  it("по умолчанию — изменения", () => {
    expect(parseOrdersHistoryTab(null)).toBe("changes");
    expect(parseOrdersHistoryTab("")).toBe("changes");
  });

  it("corrections и prosthetics", () => {
    expect(parseOrdersHistoryTab("corrections")).toBe("corrections");
    expect(parseOrdersHistoryTab("prosthetics")).toBe("prosthetics");
  });
});

describe("ordersHistoryHref", () => {
  it("сохраняет tab и q", () => {
    expect(
      ordersHistoryHref({ tab: "corrections", q: "2606-285" }),
    ).toBe("/orders/history?tab=corrections&q=2606-285");
    expect(
      ordersHistoryHref({ tab: "prosthetics", q: "2606-285" }),
    ).toBe("/orders/history?tab=prosthetics&q=2606-285");
  });
});

describe("mergeCorrectionHistoryRows", () => {
  it("сортирует по дате создания", () => {
    const older = {
      id: "a",
      kind: "correction" as const,
      text: "x",
      source: "KAITEN" as const,
      authorLabel: null,
      createdAt: new Date("2026-05-01T10:00:00Z"),
      resolvedAt: null,
      rejectedAt: null,
      arrivedAt: null,
      resolvedByName: null,
      rejectedByName: null,
      arrivedByName: null,
      order: { id: "o1", orderNumber: "1" },
    };
    const newer = {
      ...older,
      id: "b",
      kind: "prosthetics" as const,
      createdAt: new Date("2026-05-02T10:00:00Z"),
    };
    const merged = mergeCorrectionHistoryRows([older], [newer], 10);
    expect(merged.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("formatCorrectionHistoryDecision", () => {
  const base = {
    id: "1",
    kind: "correction" as const,
    text: "текст",
    source: "KAITEN" as const,
    authorLabel: null,
    createdAt: new Date("2026-05-01T10:00:00Z"),
    resolvedAt: null,
    rejectedAt: null,
    arrivedAt: null,
    resolvedByName: null,
    rejectedByName: null,
    arrivedByName: null,
    order: { id: "o", orderNumber: "2606-1" },
  };

  it("ожидает решения", () => {
    expect(formatCorrectionHistoryDecision(base).status).toBe("pending");
  });

  it("показывает принятие", () => {
    const row = {
      ...base,
      resolvedAt: new Date("2026-05-02T12:00:00Z"),
      resolvedByName: "Админ",
    };
    const d = formatCorrectionHistoryDecision(row);
    expect(d.status).toBe("accepted");
    expect(d.label).toBe("Принята");
    expect(d.detail).toContain("Админ");
  });

  it("протетика: в пути и пришла", () => {
    const inTransit = {
      ...base,
      kind: "prosthetics" as const,
      resolvedAt: new Date("2026-05-02T12:00:00Z"),
      resolvedByName: "Админ",
    };
    expect(formatCorrectionHistoryDecision(inTransit).label).toBe("В пути");

    const arrived = {
      ...inTransit,
      arrivedAt: new Date("2026-05-03T09:00:00Z"),
      arrivedByName: "Склад",
    };
    const d = formatCorrectionHistoryDecision(arrived);
    expect(d.status).toBe("arrived");
    expect(d.label).toBe(PROSTHETICS_ARRIVED_STATUS_LABEL);
    expect(d.detail).toContain("Склад");
  });
});

describe("formatCorrectionHistoryAuthorDetail", () => {
  it("с именем автора — «Имя, дата»", () => {
    const line = formatCorrectionHistoryAuthorDetail({
      authorLabel: "Ахмадиджей",
      createdAt: new Date("2026-07-24T14:36:00Z"),
    });
    expect(line).toContain("Ахмадиджей");
    expect(line).toContain(",");
  });

  it("без автора — только дата", () => {
    const line = formatCorrectionHistoryAuthorDetail({
      authorLabel: null,
      createdAt: new Date("2026-07-24T14:36:00Z"),
    });
    expect(line).toMatch(/24\.07\.2026/);
    expect(line).not.toMatch(/Ахмадиджей/);
  });
});

describe("buildCorrectionHistoryStatusTimeline", () => {
  const base = {
    id: "1",
    kind: "prosthetics" as const,
    text: "??? тест",
    source: "KAITEN" as const,
    authorLabel: "Доктор И.",
    createdAt: new Date("2026-07-10T10:33:00Z"),
    resolvedAt: null,
    rejectedAt: null,
    arrivedAt: null,
    resolvedByName: null,
    rejectedByName: null,
    arrivedByName: null,
    order: { id: "o", orderNumber: "2607-157" },
  };

  it("ожидает — только создание", () => {
    const events = buildCorrectionHistoryStatusTimeline(base);
    expect(events).toHaveLength(1);
    expect(events[0]?.label).toBe("Ожидает");
  });

  it("протетика: ожидает → в пути → пришла", () => {
    const events = buildCorrectionHistoryStatusTimeline({
      ...base,
      resolvedAt: new Date("2026-07-10T09:27:00Z"),
      resolvedByName: "Оля",
      arrivedAt: new Date("2026-07-10T16:08:00Z"),
      arrivedByName: "Всеволод С.",
    });
    expect(events.map((e) => e.label)).toEqual([
      "Ожидает",
      "В пути",
      PROSTHETICS_ARRIVED_STATUS_LABEL,
    ]);
    expect(events[1]?.who).toBe("Оля");
    expect(events[2]?.who).toBe("Всеволод С.");
  });

  it("отклонена — без в пути", () => {
    const events = buildCorrectionHistoryStatusTimeline({
      ...base,
      kind: "correction",
      rejectedAt: new Date("2026-07-11T08:00:00Z"),
      rejectedByName: "Админ",
    });
    expect(events.map((e) => e.label)).toEqual(["Ожидает", "Отклонена"]);
  });
});
