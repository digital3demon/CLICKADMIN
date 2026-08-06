import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { prisma } from "@/lib/prisma";
import {
  formatTenantApiKeyPrefixForUi,
  generateTenantApiKeyPlaintext,
  hashTenantApiKey,
  TENANT_API_KEY_SCOPE_SCANNER_INGEST,
  tenantApiKeyPrefix,
} from "@/lib/tenant-api-keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseScopesJson(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  return [];
}

/** Список API-ключей организации (OWNER). */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const rows = await prisma.tenantApiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      createdAt: true,
      revokedAt: true,
      lastUsedAt: true,
    },
  });

  return NextResponse.json({
    keys: rows.map((r) => ({
      id: r.id,
      name: r.name,
      prefixLabel: formatTenantApiKeyPrefixForUi(r.prefix),
      scopes: parseScopesJson(r.scopes),
      createdAt: r.createdAt.toISOString(),
      revokedAt: r.revokedAt?.toISOString() ?? null,
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      active: r.revokedAt == null,
    })),
  });
}

/** Создать ключ. Plaintext возвращается один раз. */
export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: { name?: unknown; scopes?: unknown } = {};
  try {
    body = (await req.json()) as { name?: unknown; scopes?: unknown };
  } catch {
    body = {};
  }

  const name = String(body.name ?? "").trim().slice(0, 80);
  if (!name) {
    return NextResponse.json(
      { error: "Укажите имя ключа (например «Сканер основной»)" },
      { status: 400 },
    );
  }

  let scopes = Array.isArray(body.scopes)
    ? body.scopes.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [TENANT_API_KEY_SCOPE_SCANNER_INGEST];
  if (scopes.length === 0) {
    scopes = [TENANT_API_KEY_SCOPE_SCANNER_INGEST];
  }

  const plaintext = generateTenantApiKeyPlaintext();
  const row = await prisma.tenantApiKey.create({
    data: {
      tenantId,
      name,
      tokenHash: hashTenantApiKey(plaintext),
      prefix: tenantApiKeyPrefix(plaintext),
      scopes,
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    id: row.id,
    name: row.name,
    prefixLabel: formatTenantApiKeyPrefixForUi(row.prefix),
    scopes: parseScopesJson(row.scopes),
    createdAt: row.createdAt.toISOString(),
    /** Показывается один раз — сохраните в программу сканера. */
    apiKey: plaintext,
  });
}
