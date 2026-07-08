import { describe, expect, it } from "vitest";
import {
  clientCardOrderStageLabel,
  formatClientCardShippedAt,
} from "./client-card-orders-table";

describe("clientCardOrderStageLabel", () => {
  it("показывает колонку Kaiten, а не устаревший labWorkStatus", () => {
    const label = clientCardOrderStageLabel({
      labWorkStatus: "TO_EXECUTION",
      kaitenColumnTitle: "Сдана админам",
      kaitenCardId: 42,
      demoKanbanColumn: null,
      adminShippedOtpr: false,
    });
    expect(label).toBe("Сдана админам");
  });

  it("fallback на labWorkStatus без Kaiten", () => {
    const label = clientCardOrderStageLabel({
      labWorkStatus: "TO_ADMINS",
      kaitenColumnTitle: null,
      kaitenCardId: null,
      demoKanbanColumn: null,
      adminShippedOtpr: false,
    });
    expect(label).toBe("Сдана админам");
  });
});

describe("formatClientCardShippedAt", () => {
  it("дата в МСК при отмеченной отгрузке", () => {
    const text = formatClientCardShippedAt(
      true,
      new Date("2025-06-04T09:38:00.000Z"),
    );
    expect(text).toMatch(/04\.06\.2025/);
  });

  it("прочерк без отгрузки", () => {
    expect(formatClientCardShippedAt(false, null)).toBe("—");
  });
});
