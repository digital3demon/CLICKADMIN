import { describe, expect, it } from "vitest";
import {
  CLIENT_STATE_MAX_JSON_BYTES,
  clientStatePayloadTooLarge,
  jsonUtf8ByteLength,
} from "@/lib/client-state-limits";

describe("client-state-limits", () => {
  it("counts utf8 bytes", () => {
    expect(jsonUtf8ByteLength({ a: "я" })).toBeGreaterThan(5);
  });

  it("flags oversized payload", () => {
    const big = "x".repeat(CLIENT_STATE_MAX_JSON_BYTES);
    const r = clientStatePayloadTooLarge("tenant", "k", { big });
    expect(r.tooLarge).toBe(true);
    expect(r.bytes).toBeGreaterThan(CLIENT_STATE_MAX_JSON_BYTES);
  });

  it("allows small payload", () => {
    const r = clientStatePayloadTooLarge("user", "k", { ok: true });
    expect(r.tooLarge).toBe(false);
  });
});
