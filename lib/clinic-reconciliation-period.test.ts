import { describe, expect, it } from "vitest";
import {
  orderWhereReconciliationPeriod,
  resolveReconciliationApprovedAt,
} from "@/lib/clinic-reconciliation-period";
import { LAB_WORK_STATUS_LABELS } from "@/lib/lab-work-status";

function snap(lab: string, column?: string | null) {
  return {
    v: 1,
    order: {
      labWorkStatus: lab,
      ...(column != null ? { kaitenColumnTitle: column } : {}),
      adminShippedOtpr: false,
    },
    constructions: [],
  };
}

describe("resolveReconciliationApprovedAt", () => {
  it("берёт выход из APPROVAL", () => {
    const t0 = new Date("2026-08-01T10:00:00.000Z");
    const t1 = new Date("2026-08-02T12:00:00.000Z");
    const at = resolveReconciliationApprovedAt({
      revisions: [
        { createdAt: t0, snapshot: snap("APPROVAL") },
        { createdAt: t1, snapshot: snap("PRODUCTION") },
      ],
    });
    expect(at?.toISOString()).toBe(t1.toISOString());
  });

  it("берёт первый вход в PRODUCTION без этапа APPROVAL", () => {
    const t0 = new Date("2026-08-01T10:00:00.000Z");
    const t1 = new Date("2026-08-03T09:00:00.000Z");
    const at = resolveReconciliationApprovedAt({
      revisions: [
        { createdAt: t0, snapshot: snap("TO_EXECUTION") },
        { createdAt: t1, snapshot: snap("PRODUCTION") },
      ],
    });
    expect(at?.toISOString()).toBe(t1.toISOString());
  });

  it("берёт веху колонки Kaiten «Производство»", () => {
    const t0 = new Date("2026-08-01T10:00:00.000Z");
    const t1 = new Date("2026-08-04T11:00:00.000Z");
    const at = resolveReconciliationApprovedAt({
      revisions: [
        {
          createdAt: t0,
          snapshot: snap("TO_EXECUTION", LAB_WORK_STATUS_LABELS.APPROVAL),
        },
        {
          createdAt: t1,
          snapshot: snap("TO_EXECUTION", LAB_WORK_STATUS_LABELS.PRODUCTION),
        },
      ],
    });
    expect(at?.toISOString()).toBe(t1.toISOString());
  });

  it("без переходов возвращает null", () => {
    const at = resolveReconciliationApprovedAt({
      revisions: [
        {
          createdAt: new Date("2026-08-01T10:00:00.000Z"),
          snapshot: snap("TO_EXECUTION"),
        },
      ],
    });
    expect(at).toBeNull();
  });
});

describe("orderWhereReconciliationPeriod", () => {
  it("фильтрует по дате записи (не createdAt)", () => {
    const range = {
      from: new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0)),
      to: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
    };
    const where = orderWhereReconciliationPeriod(range);
    expect(where).toHaveProperty("OR");
    const json = JSON.stringify(where);
    expect(json).toContain("appointmentDate");
    expect(json).toContain("dueToAdminsAt");
    expect(json).not.toContain("createdAt");
  });
});
