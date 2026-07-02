import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  corsHeadersForClickMig,
  getApiKeyFromRequest,
  resolveClickMigTenantFromApiKey,
  verifyClickMigClientSession,
  clickMigClientCookieName,
} from "./public-auth.server";
import { resolveDefaultClickMigTenantId } from "./default-tenant.server";
import {
  hostFromNextRequest,
  isTrustedClickMigPublicHost,
} from "./form-host";
import { getClickMigConfig } from "./config.server";

export async function resolvePublicClickMigContext(req: NextRequest): Promise<
  | { ok: true; tenantId: string; prisma: Awaited<ReturnType<typeof getOrdersPrisma>>; allowedOrigins: string[] }
  | { ok: false; response: NextResponse }
> {
  const prisma = await getOrdersPrisma();
  const apiKey = getApiKeyFromRequest(req);
  let tenantId = await resolveClickMigTenantFromApiKey(prisma, apiKey);
  if (!tenantId && isTrustedClickMigPublicHost(hostFromNextRequest(req))) {
    tenantId = await resolveDefaultClickMigTenantId(prisma);
  }
  if (!tenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Неверный API-ключ" }, { status: 401 }),
    };
  }
  const { json } = await getClickMigConfig(prisma, tenantId);
  return { ok: true, tenantId, prisma, allowedOrigins: json.allowedOrigins };
}

export function withClickMigCors(
  req: NextRequest,
  allowedOrigins: string[],
  response: NextResponse,
): NextResponse {
  const origin = req.headers.get("origin");
  const headers = corsHeadersForClickMig(origin, allowedOrigins);
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v);
  }
  return response;
}

export function clickMigOptionsResponse(
  req: NextRequest,
  allowedOrigins: string[],
): NextResponse {
  const res = new NextResponse(null, { status: 204 });
  return withClickMigCors(req, allowedOrigins, res);
}

export async function getOptionalClientSession(req: NextRequest) {
  const token =
    req.cookies.get(clickMigClientCookieName())?.value ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return verifyClickMigClientSession(token);
}
