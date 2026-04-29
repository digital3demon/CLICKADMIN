import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import type { JWTPayload } from "jose";
import type { SubscriptionPlan, UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "crm_session";

/** HttpOnly-сессия демо: отдельный файл БД и отдельный JWT (не смешивается с боевой сессией). */
export const SESSION_DEMO_COOKIE_NAME = "crm_session_demo";

export type SessionClaims = {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
  /** true — запросы идут в демо-БД; допустимо только в cookie `SESSION_DEMO_COOKIE_NAME`. */
  demo?: boolean;
  /** cuid `Tenant` */
  tid?: string;
  plan?: SubscriptionPlan;
  /** Опция «Канбан» (доска), оплачиваемая отдельно */
  addonKanban?: boolean;
};

export function getAuthSecretKey(): Uint8Array | null {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

function secretKey(): Uint8Array {
  const k = getAuthSecretKey();
  if (!k) {
    throw new Error("AUTH_SECRET required (min 16 characters)");
  }
  return k;
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  const body: Record<string, unknown> = {
    sub: claims.sub,
    email: claims.email,
    role: claims.role,
    name: claims.name,
  };
  if (claims.demo) body.demo = true;
  if (claims.tid) body.tid = claims.tid;
  if (claims.plan) body.plan = claims.plan;
  if (claims.addonKanban === true) body.addonKanban = true;
  return new SignJWT(body as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const key = getAuthSecretKey();
    if (!key) return null;
    const { payload } = await jwtVerify(token, key);
    const sub = String(payload.sub ?? "");
    const email = String(payload.email ?? "");
    const role = payload.role as UserRole;
    const name = String(payload.name ?? "");
    const demo = payload.demo === true;
    if (!sub || !email || !role) return null;
    const tid = payload.tid != null ? String(payload.tid) : undefined;
    const plan = payload.plan as SubscriptionPlan | undefined;
    const addonKanban = payload.addonKanban === true;
    return {
      sub,
      email,
      role,
      name,
      ...(demo ? { demo: true as const } : {}),
      ...(tid ? { tid } : {}),
      ...(plan ? { plan } : {}),
      ...(addonKanban ? { addonKanban: true as const } : {}),
    };
  } catch {
    return null;
  }
}
