import { describe, expect, it } from "vitest";
import {
  clientCardOrderStageLabel,
  formatClientCardShippedAt,
} from "./client-card-orders-table";

describe("clientCardOrderStageLabel", () => {
  it("показывает labWorkStatus из БД", () => {
    const label = clientCardOrderStageLabel({
      labWorkStatus: "TO_ADMINS",
      demoKanbanColumn: null,
      adminShippedOtpr: false,
      adminShippedAt: null,
    });
    expect(label).toBe("Сдана админам");
  });

  it("показывает колонку демо-канбана", () => {
    const label = clientCardOrderStageLabel({
      labWorkStatus: "TO_EXECUTION",
      demoKanbanColumn: "IN_PROGRESS",
      adminShippedOtpr: false,
      adminShippedAt: null,
    });
    expect(label).toBe("Канбан CRM: В работе");
  });
});

describe("formatClientCardShippedAt", () => {
  it("дата в МСК при отмеченной отгрузке", () => {
    const text = formatClientCardShippedAt({
      adminShippedOtpr: true,
      adminShippedAt: new Date("2025-06-04T09:38:00.000Z"),
    });
    expect(text).toMatch(/04\.06\.2025/);
  });

  it("прочерк без отгрузки", () => {
    expect(
      formatClientCardShippedAt({
        adminShippedOtpr: false,
        adminShippedAt: null,
      }),
    ).toBe("—");
  });
});
