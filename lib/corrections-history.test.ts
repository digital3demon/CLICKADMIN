import { describe, expect, it } from "vitest";
import {
  formatCorrectionHistoryDecision,
  mergeCorrectionHistoryRows,
  ordersHistoryHref,
  parseOrdersHistoryTab,
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
    expect(d.label).toBe("Пришла");
    expect(d.detail).toContain("Склад");
  });
});
