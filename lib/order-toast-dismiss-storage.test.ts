import { describe, expect, it } from "vitest";
import {
  collectToastDismissKeys,
  capDismissedIds,
  ORDER_TOAST_DISMISSED_MAX,
  orderToastDismissKey,
  parseDismissedIdList,
  shouldExpandToastStack,
} from "@/lib/order-toast-dismiss-storage";

describe("orderToastDismissKey", () => {
  it("prefixes kind", () => {
    expect(orderToastDismissKey("personal", "abc")).toBe("personal:abc");
  });
});

describe("parseDismissedIdList", () => {
  it("keeps only non-empty strings", () => {
    expect(parseDismissedIdList(["a", 1, "", "b", null])).toEqual(["a", "b"]);
    expect(parseDismissedIdList(null)).toEqual([]);
  });
});

describe("collectToastDismissKeys", () => {
  it("collects all kinds", () => {
    expect(
      collectToastDismissKeys({
        chat: [{ id: "c1" }],
        corrections: [{ id: "r1" }],
        prosthetics: [{ id: "p1" }],
        personal: [{ id: "m1" }, { id: "m2" }],
      }),
    ).toEqual([
      "chat:c1",
      "correction:r1",
      "prosthetics:p1",
      "personal:m1",
      "personal:m2",
    ]);
  });
});

describe("capDismissedIds", () => {
  it("keeps tail when over max", () => {
    const ids = Array.from({ length: ORDER_TOAST_DISMISSED_MAX + 3 }, (_, i) =>
      String(i),
    );
    const capped = capDismissedIds(ids);
    expect(capped).toHaveLength(ORDER_TOAST_DISMISSED_MAX);
    expect(capped[0]).toBe("3");
    expect(capped[capped.length - 1]).toBe(String(ORDER_TOAST_DISMISSED_MAX + 2));
  });
});

describe("shouldExpandToastStack", () => {
  it("expands only for new non-dismissed keys", () => {
    expect(
      shouldExpandToastStack({
        nextKeys: new Set(["personal:a", "personal:b"]),
        prevKeys: new Set(["personal:a"]),
        dismissed: new Set(),
      }),
    ).toBe(true);

    expect(
      shouldExpandToastStack({
        nextKeys: new Set(["personal:a", "personal:b"]),
        prevKeys: new Set(["personal:a"]),
        dismissed: new Set(["personal:b"]),
      }),
    ).toBe(false);

    expect(
      shouldExpandToastStack({
        nextKeys: new Set(["personal:a"]),
        prevKeys: new Set(["personal:a"]),
        dismissed: new Set(),
      }),
    ).toBe(false);
  });
});
