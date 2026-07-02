import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { getClickMigConfig } from "./config.server";

const CLIENT_COOKIE = "clickmig_client_session";
const API_KEY_HEADER = "x-clickmig-api-key";

export function hashClickMigApiKey(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyClickMigApiKey(plain: string, hash: string | null | undefined): boolean {
  if (!hash?.trim()) return false;
  return bcrypt.compareSync(plain, hash);
}

export function generateClickMigApiKey(): string {
  return `cm_${randomBytes(24).toString("hex")}`;
}

export async function resolveClickMigTenantFromApiKey(
  prisma: Parameters<typeof getClickMigConfig>[0],
  apiKey: string | null,
): Promise<string | null> {
  if (!apiKey?.trim()) return null;
  const envKey = process.env.CLICKMIG_PUBLIC_API_KEY?.trim();
  const envTenant = process.env.CLICKMIG_TENANT_ID?.trim();
  if (envKey && apiKey === envKey && envTenant) {
    return envTenant;
  }
  const configs = await prisma.clickMigConfig.findMany({
    where: { publicApiKeyHash: { not: null } },
    select: { tenantId: true, publicApiKeyHash: true },
  });
  for (const c of configs) {
    if (verifyClickMigApiKey(apiKey, c.publicApiKeyHash)) {
      return c.tenantId;
    }
  }
  return null;
}

export function getApiKeyFromRequest(req: NextRequest): string | null {
  return (
    req.headers.get(API_KEY_HEADER)?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    null
  );
}

function clientJwtSecret(): Uint8Array {
  const secret =
    process.env.CLICKMIG_CLIENT_JWT_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "clickmig-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export type ClickMigClientSession = {
  clientId: string;
  tenantId: string;
  email: string;
};

export async function signClickMigClientSession(
  payload: ClickMigClientSession,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(clientJwtSecret());
}

export async function verifyClickMigClientSession(
  token: string | null | undefined,
): Promise<ClickMigClientSession | null> {
  if (!token?.trim()) return null;
  try {
    const { payload } = await jwtVerify(token, clientJwtSecret());
    const clientId = String(payload.clientId ?? "");
    const tenantId = String(payload.tenantId ?? "");
    const email = String(payload.email ?? "");
    if (!clientId || !tenantId || !email) return null;
    return { clientId, tenantId, email };
  } catch {
    return null;
  }
}

export function clickMigClientCookieName(): string {
  return CLIENT_COOKIE;
}

export function clickMigResubmitToken(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex").slice(0, 32);
}

export function corsHeadersForClickMig(origin: string | null, allowed: string[]): HeadersInit {
  if (!origin || !allowed.includes(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-clickmig-api-key, x-upload-filename, x-upload-mime",
  };
}
