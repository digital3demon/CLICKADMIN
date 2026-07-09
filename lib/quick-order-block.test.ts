import { describe, expect, it } from "vitest";
import type { QuickOrderState } from "@/components/orders/new-order-form/quick-order-types";
import {
  QUICK_ORDER_BLOCK_REASON_FALLBACK,
  quickOrderBlockReasonFromState,
  quickOrderBlockValidationError,
  tileRequestsKaitenBlock,
} from "./quick-order-block";

function tile(
  overrides: Partial<QuickOrderState["tiles"][number]> = {},
): QuickOrderState["tiles"][number] {
  return {
    id: "t1",
    title: "Сплинт",
    accentColor: "#0ea5e9",
    basePriceListItemId: "pli-1",
    basePriceSummary: "001 · Сплинт",
    baseActive: true,
    isBlockTile: false,
    blockOnSave: false,
    blockReason: "",
    options: [],
    ...overrides,
  };
}

describe("tileRequestsKaitenBlock", () => {
  it("block tile blocks without price selection", () => {
    expect(
      tileRequestsKaitenBlock(
        tile({
          isBlockTile: true,
          blockOnSave: true,
          blockReason: "ждём сканы",
          basePriceListItemId: null,
          basePriceSummary: null,
          baseActive: false,
        }),
      ),
    ).toBe(true);
  });

  it("block tile off does not block", () => {
    expect(
      tileRequestsKaitenBlock(
        tile({
          isBlockTile: true,
          blockOnSave: false,
          blockReason: "ждём сканы",
        }),
      ),
    ).toBe(false);
  });

  it("legacy: needs selected composition", () => {
    expect(
      tileRequestsKaitenBlock(
        tile({
          isBlockTile: false,
          blockOnSave: true,
          baseActive: false,
        }),
      ),
    ).toBe(false);
    expect(
      tileRequestsKaitenBlock(
        tile({
          isBlockTile: false,
          blockOnSave: true,
          baseActive: true,
        }),
      ),
    ).toBe(true);
  });
});

describe("quickOrderBlockReasonFromState", () => {
  it("returns reason from block tile without composition", () => {
    const q: QuickOrderState = {
      v: 2,
      tiles: [
        tile({
          isBlockTile: true,
          blockOnSave: true,
          blockReason: "ждём КТ",
          basePriceListItemId: null,
          baseActive: false,
        }),
      ],
      continueWork: null,
    };
    expect(quickOrderBlockReasonFromState(q)).toBe("ждём КТ");
  });

  it("returns reason from active tile with blockOnSave (legacy)", () => {
    const q: QuickOrderState = {
      v: 2,
      tiles: [tile({ blockOnSave: true, blockReason: "ждём КТ" })],
      continueWork: null,
    };
    expect(quickOrderBlockReasonFromState(q)).toBe("ждём КТ");
  });

  it("uses fallback when reason empty", () => {
    const q: QuickOrderState = {
      v: 2,
      tiles: [
        tile({
          isBlockTile: true,
          blockOnSave: true,
          blockReason: "  ",
          baseActive: false,
          basePriceListItemId: null,
        }),
      ],
      continueWork: null,
    };
    expect(quickOrderBlockReasonFromState(q)).toBe(
      QUICK_ORDER_BLOCK_REASON_FALLBACK,
    );
  });

  it("ignores inactive legacy tiles", () => {
    const q: QuickOrderState = {
      v: 2,
      tiles: [
        tile({
          baseActive: false,
          blockOnSave: true,
          blockReason: "не должно",
        }),
      ],
      continueWork: null,
    };
    expect(quickOrderBlockReasonFromState(q)).toBeNull();
  });
});

describe("quickOrderBlockValidationError", () => {
  it("does not require reason", () => {
    const q: QuickOrderState = {
      v: 2,
      tiles: [
        tile({
          isBlockTile: true,
          blockOnSave: true,
          blockReason: "",
        }),
      ],
      continueWork: null,
    };
    expect(quickOrderBlockValidationError(q)).toBeNull();
  });
});
