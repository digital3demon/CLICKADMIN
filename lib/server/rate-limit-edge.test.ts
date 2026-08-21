import { describe, expect, it } from "vitest";
import { rateLimitAllow } from "./rate-limit-edge";

describe("rateLimitAllow", () => {
  it("держит окно 15 мин отдельно от минутного", () => {
    const key = `t-${Date.now()}-${Math.random()}`;
    expect(rateLimitAllow(key, 2, 900_000)).toBe(true);
    expect(rateLimitAllow(key, 2, 900_000)).toBe(true);
    expect(rateLimitAllow(key, 2, 900_000)).toBe(false);
  });

  it("новый ключ не делит счётчик", () => {
    const a = `a-${Date.now()}-${Math.random()}`;
    const b = `b-${Date.now()}-${Math.random()}`;
    expect(rateLimitAllow(a, 1, 60_000)).toBe(true);
    expect(rateLimitAllow(a, 1, 60_000)).toBe(false);
    expect(rateLimitAllow(b, 1, 60_000)).toBe(true);
  });
});
