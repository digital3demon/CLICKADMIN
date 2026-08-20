import { describe, expect, it } from "vitest";
import { withKeptOrderIds } from "@/lib/orders-list-keep-where";

describe("withKeptOrderIds", () => {
  it("без keep — тот же фильтр", () => {
    const filter = { dueDate: { gte: new Date("2026-08-20T00:00:00+03:00") } };
    expect(withKeptOrderIds(filter, [])).toBe(filter);
  });

  it("с keep — OR фильтра и id", () => {
    const filter = { dueDate: { gte: new Date("2026-08-20T00:00:00+03:00") } };
    expect(withKeptOrderIds(filter, ["clxxxxxxxxxxxxxxxx"])).toEqual({
      OR: [filter, { id: { in: ["clxxxxxxxxxxxxxxxx"] } }],
    });
  });
});
