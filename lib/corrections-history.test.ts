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

  it("corrections для вкладки корректировок", () => {
    expect(parseOrdersHistoryTab("corrections")).toBe("corrections");
  });
});

describe("ordersHistoryHref", () => {
  it("сохраняет tab и q", () => {
    expect(
      ordersHistoryHref({ tab: "corrections", q: "2606-285" }),
    ).toBe("/orders/history?tab=corrections&q=2606-285");
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
      resolvedByName: null,
      rejectedByName: null,
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
    resolvedByName: null,
    rejectedByName: null,
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
    expect(d.detail).toContain("Админ");
  });
});
