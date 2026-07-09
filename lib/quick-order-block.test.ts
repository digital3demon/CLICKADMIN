import { describe, expect, it } from "vitest";
import type { QuickOrderState } from "@/components/orders/new-order-form/quick-order-types";
import {
  QUICK_ORDER_BLOCK_REASON_FALLBACK,
  quickOrderBlockReasonFromState,
  quickOrderBlockValidationError,
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
    blockOnSave: false,
    blockReason: "",
    options: [],
    ...overrides,
  };
}

describe("quickOrderBlockReasonFromState", () => {
  it("returns reason from active tile with blockOnSave", () => {
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
      tiles: [tile({ blockOnSave: true, blockReason: "  " })],
      continueWork: null,
    };
    expect(quickOrderBlockReasonFromState(q)).toBe(
      QUICK_ORDER_BLOCK_REASON_FALLBACK,
    );
  });

  it("ignores inactive tiles", () => {
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
      tiles: [tile({ blockOnSave: true, blockReason: "" })],
      continueWork: null,
    };
    expect(quickOrderBlockValidationError(q)).toBeNull();
  });
});
