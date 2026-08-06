import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const TENANT_API_KEY_SCOPE_SCANNER_INGEST = "scanner.ingest";

export type ResolvedTenantApiKey = {
  keyId: string;
  tenantId: string;
  name: string;
  scopes: string[];
};

function parseScopes(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => String(x ?? "").trim())
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseScopes(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export function generateTenantApiKeyPlaintext(): string {
  return `dl_${randomBytes(24).toString("hex")}`;
}

/** Короткий префикс для UI и индекса (без многоточия — чтобы искать по startsWith). */
export function tenantApiKeyPrefix(plain: string): string {
  const p = plain.trim();
  return p.slice(0, 11);
}

export function formatTenantApiKeyPrefixForUi(prefix: string): string {
  const p = prefix.trim();
  if (p.length <= 7) return p;
  return `${p.slice(0, 7)}…`;
}

export function hashTenantApiKey(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyTenantApiKey(
  plain: string,
  hash: string | null | undefined,
): boolean {
  if (!hash?.trim()) return false;
  return bcrypt.compareSync(plain, hash);
}

export function tenantApiKeyHasScope(
  scopes: string[],
  required: string,
): boolean {
  if (scopes.includes("*")) return true;
  return scopes.includes(required);
}

export function bearerTokenFromAuthorizationHeader(
  authorization: string | null | undefined,
): string | null {
  const raw = String(authorization ?? "").trim();
  if (!raw) return null;
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  if (!m) return null;
  const token = m[1]?.trim() ?? "";
  return token || null;
}

/**
 * Ищет активный ключ по plaintext Bearer.
 * Сначала фильтр по prefix (ускорение), затем bcrypt.
 */
export async function resolveTenantApiKey(
  plainKey: string | null | undefined,
): Promise<ResolvedTenantApiKey | null> {
  const plain = String(plainKey ?? "").trim();
  if (!plain.startsWith("dl_") || plain.length < 20) return null;

  const prefix = tenantApiKeyPrefix(plain);
  const candidates = await prisma.tenantApiKey.findMany({
    where: {
      revokedAt: null,
      prefix,
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      tokenHash: true,
      scopes: true,
    },
    take: 20,
  });

  let matched: (typeof candidates)[number] | null = null;
  for (const row of candidates) {
    if (verifyTenantApiKey(plain, row.tokenHash)) {
      matched = row;
      break;
    }
  }

  if (!matched) {
    const fallback = await prisma.tenantApiKey.findMany({
      where: {
        revokedAt: null,
        prefix: { startsWith: plain.slice(0, 7) },
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        tokenHash: true,
        scopes: true,
      },
      take: 50,
    });
    for (const row of fallback) {
      if (verifyTenantApiKey(plain, row.tokenHash)) {
        matched = row;
        break;
      }
    }
  }

  if (!matched) return null;

  void prisma.tenantApiKey
    .update({
      where: { id: matched.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    keyId: matched.id,
    tenantId: matched.tenantId,
    name: matched.name,
    scopes: parseScopes(matched.scopes),
  };
}

/** Сравнение scope-строк без утечки по таймингу для коротких констант. */
export function safeScopeIncludes(scopes: string[], required: string): boolean {
  if (scopes.includes("*")) return true;
  const want = Buffer.from(required);
  for (const s of scopes) {
    const got = Buffer.from(s);
    if (got.length === want.length && timingSafeEqual(got, want)) return true;
  }
  return false;
}

export function fingerprintApiKeyForLog(plain: string): string {
  return createHash("sha256").update(plain).digest("hex").slice(0, 12);
}
