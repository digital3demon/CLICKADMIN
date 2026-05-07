import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "dg";
const TOKEN_TTL_SEC = 15 * 60;

function authSecret(): string | null {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s || s.length < 16) return null;
  return s;
}

function signPayload(
  secret: string,
  tenantId: string,
  doctorId: string,
  expSec: number,
): string {
  const payload = `${tenantId}:${doctorId}:${expSec}`;
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return mac.slice(0, 22);
}

/** Одноразовый токен: отправить в группе как `/start <token>` после добавления бота. */
export function createDoctorTelegramGroupBindToken(
  tenantId: string,
  doctorId: string,
): string | null {
  const secret = authSecret();
  if (!secret) return null;
  const expSec = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const sig = signPayload(secret, tenantId, doctorId, expSec);
  return `${TOKEN_PREFIX}_${tenantId}_${doctorId}_${expSec}_${sig}`;
}

export function verifyDoctorTelegramGroupBindToken(
  token: string,
):
  | { ok: true; tenantId: string; doctorId: string }
  | { ok: false; error: string } {
  const secret = authSecret();
  if (!secret) return { ok: false, error: "auth_secret_missing" };
  const raw = token.trim();
  const parts = raw.split("_");
  /* Подпись base64url может содержать «_» — собираем хвост после expSec. */
  if (parts.length < 5 || parts[0] !== TOKEN_PREFIX) {
    return { ok: false, error: "bad_format" };
  }
  const tenantId = parts[1] ?? "";
  const doctorId = parts[2] ?? "";
  const expRaw = parts[3] ?? "";
  const sig = parts.slice(4).join("_");
  if (!tenantId || !/^[a-z0-9]+$/i.test(tenantId)) {
    return { ok: false, error: "bad_tenant" };
  }
  if (!doctorId || !/^[a-z0-9]+$/i.test(doctorId)) {
    return { ok: false, error: "bad_doctor" };
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
  const expected = signPayload(secret, tenantId, doctorId, expSec);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "bad_sig" };
  }
  return { ok: true, tenantId, doctorId };
}
