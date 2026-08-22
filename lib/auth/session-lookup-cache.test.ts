import { afterEach, describe, expect, it } from "vitest";
import {
  clearSessionLookupCacheForTests,
  invalidateSessionLookupCacheBySid,
  invalidateSessionLookupCacheByUserId,
  readSessionLookupCache,
  SESSION_LOOKUP_CACHE_TTL_MS,
  sessionLookupCacheKey,
  writeSessionLookupCache,
} from "./session-lookup-cache";

afterEach(() => {
  clearSessionLookupCacheForTests();
});

describe("sessionLookupCache", () => {
  it("ключ отличает sid, demo и view-as", () => {
    const a = sessionLookupCacheKey({ sid: "s1", demo: false, viewAsRaw: "" });
    const b = sessionLookupCacheKey({ sid: "s1", demo: true, viewAsRaw: "" });
    const c = sessionLookupCacheKey({
      sid: "s1",
      demo: false,
      viewAsRaw: "ADMIN",
    });
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("hit внутри TTL, miss после", () => {
    const key = sessionLookupCacheKey({
      sid: "s1",
      demo: false,
      viewAsRaw: "",
    });
    const session = { sub: "u1", sid: "s1" };
    writeSessionLookupCache(key, session, 1_000);
    expect(readSessionLookupCache(key, 1_000 + 9_000)).toEqual(session);
    expect(
      readSessionLookupCache(key, 1_000 + SESSION_LOOKUP_CACHE_TTL_MS + 1),
    ).toBeUndefined();
  });

  it("revoke по sid не оставляет положительный hit", () => {
    const key = sessionLookupCacheKey({
      sid: "s1",
      demo: false,
      viewAsRaw: "OWNER",
    });
    writeSessionLookupCache(key, { sub: "u1", sid: "s1" });
    invalidateSessionLookupCacheBySid("s1");
    expect(readSessionLookupCache(key)).toBeUndefined();
  });

  it("revoke по userId сбрасывает все sid пользователя", () => {
    const k1 = sessionLookupCacheKey({
      sid: "s1",
      demo: false,
      viewAsRaw: "",
    });
    const k2 = sessionLookupCacheKey({
      sid: "s2",
      demo: false,
      viewAsRaw: "",
    });
    writeSessionLookupCache(k1, { sub: "u1", sid: "s1" });
    writeSessionLookupCache(k2, { sub: "u2", sid: "s2" });
    invalidateSessionLookupCacheByUserId("u1");
    expect(readSessionLookupCache(k1)).toBeUndefined();
    expect(readSessionLookupCache(k2)).toEqual({ sub: "u2", sid: "s2" });
  });
});
