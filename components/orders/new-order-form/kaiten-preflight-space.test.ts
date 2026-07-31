import { describe, expect, it } from "vitest";
import { resolvePreferredSpaceForCardType } from "@/components/orders/new-order-form/KaitenPreflightModal";

describe("resolvePreferredSpaceForCardType", () => {
  const both = ["ORTHOPEDICS", "ORTHODONTICS"] as const;

  it("prefers map by kaiten type id", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "cuid-1",
        typeName: "Постоянные",
        defaultSpaceByCardType: { "cuid-1": "ORTHODONTICS" },
        availableSpaces: both,
      }),
    ).toBe("ORTHODONTICS");
  });

  it("falls back to map by normalized name when ids differ (CRM vs Kaiten)", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "kaiten-cuid",
        typeName: "Постоянные",
        defaultSpaceByCardType: {
          "crm-local-id": "ORTHOPEDICS",
          "name:постоянные": "ORTHOPEDICS",
        },
        availableSpaces: both,
      }),
    ).toBe("ORTHOPEDICS");
  });

  it("uses orthodontics heuristic for ортоаппараты", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "x",
        typeName: "ОртоАппараты",
        defaultSpaceByCardType: {},
        availableSpaces: both,
      }),
    ).toBe("ORTHODONTICS");
  });

  it("defaults to orthopedics when available", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "x",
        typeName: "Постоянные",
        defaultSpaceByCardType: {},
        availableSpaces: both,
      }),
    ).toBe("ORTHOPEDICS");
  });

  it("ignores preferred lane not in available spaces", () => {
    expect(
      resolvePreferredSpaceForCardType({
        typeId: "x",
        typeName: "Постоянные",
        defaultSpaceByCardType: { "name:постоянные": "TEST" },
        availableSpaces: ["ORTHOPEDICS"],
      }),
    ).toBe("ORTHOPEDICS");
  });
});
