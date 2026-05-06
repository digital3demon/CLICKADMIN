import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "sa";
const TOKEN_TTL_SEC = 10 * 60;

function authSecret(): string | null {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s || s.length < 16) return null;
  return s;
}

function signPayload(secret: string, tenantId: string, expSec: number): string {
  const payload = `${tenantId}:${expSec}`;
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return mac.slice(0, 22);
}

export function createAdminSharedMessengerBotStartToken(
  tenantId: string,
): string | null {
  const secret = authSecret();
  if (!secret) return null;
  const expSec = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const sig = signPayload(secret, tenantId, expSec);
  return `${TOKEN_PREFIX}_${tenantId}_${expSec}_${sig}`;
}

export function verifyAdminSharedMessengerBotStartToken(
  token: string,
): { ok: true; tenantId: string } | { ok: false; error: string } {
  const secret = authSecret();
  if (!secret) return { ok: false, error: "auth_secret_missing" };
  const raw = token.trim();
  const parts = raw.split("_");
  if (parts.length !== 4 || parts[0] !== TOKEN_PREFIX) {
    return { ok: false, error: "bad_format" };
  }
  const tenantId = parts[1] ?? "";
  const expRaw = parts[2] ?? "";
  const sig = parts[3] ?? "";
  if (!tenantId || !/^[a-z0-9]+$/i.test(tenantId)) {
    return { ok: false, error: "bad_tenant" };
  }
  if (!/^\d{9,12}$/.test(expRaw)) {
    return { ok: false, error: "bad_exp" };
  }
  const expSec = Number(expRaw);
  if (!Number.isFinite(expSec)) {
    return { ok: false, error: "bad_exp" };
  }
  if (Math.floor(Date.now() / 1000) > expSec) {
    return { ok: false, error: "expired" };
  }
  const expected = signPayload(secret, tenantId, expSec);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "bad_sig" };
  }
  return { ok: true, tenantId };
}

