import { describe, expect, it } from "vitest";
import { findFirstHandedToAdminsAt } from "@/lib/analytics/order-handed-at";

const snap = (order: Record<string, unknown>) => ({
  v: 1 as const,
  order,
  constructions: [],
});

describe("findFirstHandedToAdminsAt", () => {
  it("returns first revision where status becomes TO_ADMINS", () => {
    const at = new Date("2026-06-10T12:00:00.000Z");
    const result = findFirstHandedToAdminsAt([
      {
        createdAt: new Date("2026-06-09T10:00:00.000Z"),
        snapshot: snap({ labWorkStatus: "PRODUCTION" }),
      },
      {
        createdAt: at,
        snapshot: snap({ labWorkStatus: "TO_ADMINS" }),
      },
    ]);
    expect(result?.toISOString()).toBe(at.toISOString());
  });

  it("returns first revision where kaiten column becomes handed to admins", () => {
    const at = new Date("2026-06-11T15:00:00.000Z");
    const result = findFirstHandedToAdminsAt([
      {
        createdAt: new Date("2026-06-09T10:00:00.000Z"),
        snapshot: snap({
          labWorkStatus: "PRODUCTION",
          kaitenColumnTitle: "Производство",
        }),
      },
      {
        createdAt: at,
        snapshot: snap({
          labWorkStatus: "PRODUCTION",
          kaitenColumnTitle: "Сдана админам",
        }),
      },
    ]);
    expect(result?.toISOString()).toBe(at.toISOString());
  });

  it("falls back to current kaiten column when sync did not write a revision", () => {
    const synced = new Date("2026-06-12T08:00:00.000Z");
    const result = findFirstHandedToAdminsAt([], {
      labWorkStatus: "PRODUCTION",
      kaitenColumnTitle: "Сдана админам",
      updatedAt: new Date("2026-06-13T00:00:00.000Z"),
      kaitenSyncedAt: synced,
    });
    expect(result?.toISOString()).toBe(synced.toISOString());
  });
});
