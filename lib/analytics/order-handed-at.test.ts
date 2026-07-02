import { describe, expect, it } from "vitest";
import { findFirstHandedToAdminsAt } from "@/lib/analytics/order-handed-at";

describe("findFirstHandedToAdminsAt", () => {
  it("returns first revision where status becomes TO_ADMINS", () => {
    const at = new Date("2026-06-10T12:00:00.000Z");
    const result = findFirstHandedToAdminsAt([
      {
        createdAt: new Date("2026-06-09T10:00:00.000Z"),
        snapshot: {
          v: 1,
          order: { labWorkStatus: "PRODUCTION" },
          constructions: [],
        },
      },
      {
        createdAt: at,
        snapshot: {
          v: 1,
          order: { labWorkStatus: "TO_ADMINS" },
          constructions: [],
        },
      },
    ]);
    expect(result?.toISOString()).toBe(at.toISOString());
  });
});
