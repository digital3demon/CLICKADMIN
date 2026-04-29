import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getAuthSecretKey,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/jwt";
import type { SessionClaims } from "@/lib/auth/jwt";

describe("getAuthSecretKey", () => {
  const prev = process.env.AUTH_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prev;
  });

  it("returns null when unset", () => {
    delete process.env.AUTH_SECRET;
    expect(getAuthSecretKey()).toBeNull();
  });

  it("returns null when too short", () => {
    process.env.AUTH_SECRET = "x".repeat(15);
    expect(getAuthSecretKey()).toBeNull();
  });

  it("returns key bytes when long enough", () => {
    process.env.AUTH_SECRET = "x".repeat(16);
    const k = getAuthSecretKey();
    expect(k).not.toBeNull();
    expect(k!.byteLength).toBeGreaterThan(0);
  });
});

describe("signSessionToken / verifySessionToken", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret-min-16";
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  it("roundtrips claims", async () => {
    const claims: SessionClaims = {
      sub: "user-1",
      email: "a@example.com",
      role: "OWNER",
      name: "Test",
    };
    const token = await signSessionToken(claims);
    expect(await verifySessionToken(token)).toEqual(claims);
  });

  it("roundtrips USER (канбан-only) role", async () => {
    const claims: SessionClaims = {
      sub: "user-kanban",
      email: "board@example.com",
      role: "USER",
      name: "Board",
    };
    const token = await signSessionToken(claims);
    expect(await verifySessionToken(token)).toEqual(claims);
  });

  it("returns null for garbage token", async () => {
    expect(await verifySessionToken("not.a.jwt")).toBeNull();
  });

  it("returns null when AUTH_SECRET missing", async () => {
    const claims: SessionClaims = {
      sub: "user-1",
      email: "a@example.com",
      role: "ADMINISTRATOR",
      name: "X",
    };
    const token = await signSessionToken(claims);
    delete process.env.AUTH_SECRET;
    expect(await verifySessionToken(token)).toBeNull();
  });
});
