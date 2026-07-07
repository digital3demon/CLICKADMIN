import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import {
  KAITEN_USERS_DIRECTORY_KEY,
  KAITEN_USERS_DIRECTORY_TTL_MS,
} from "@/lib/kaiten-members-config";
import { normalizeKaitenMatchEmail } from "@/lib/kaiten-members-parse";
import {
  kaitenListSpaceUsers,
  type KaitenAuth,
  type KaitenSpaceUserRow,
} from "@/lib/kaiten-rest";

export { normalizeKaitenMatchEmail };

type DirectoryCache = {
  fetchedAt: string;
  byUserId: Record<string, { email: string; fullName: string }>;
};

function parseDirectoryCache(value: unknown): DirectoryCache | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.fetchedAt !== "string") return null;
  if (o.byUserId == null || typeof o.byUserId !== "object" || Array.isArray(o.byUserId)) {
    return null;
  }
  const byUserId: DirectoryCache["byUserId"] = {};
  for (const [k, v] of Object.entries(o.byUserId as Record<string, unknown>)) {
    if (v == null || typeof v !== "object" || Array.isArray(v)) continue;
    const row = v as Record<string, unknown>;
    const email = normalizeKaitenMatchEmail(
      typeof row.email === "string" ? row.email : "",
    );
    const fullName =
      typeof row.fullName === "string" && row.fullName.trim()
        ? row.fullName.trim()
        : email.split("@")[0] || k;
    byUserId[k] = { email, fullName };
  }
  return { fetchedAt: o.fetchedAt, byUserId };
}

function directoryFromUsers(users: KaitenSpaceUserRow[]): DirectoryCache {
  const byUserId: DirectoryCache["byUserId"] = {};
  for (const u of users) {
    byUserId[String(u.id)] = {
      email: normalizeKaitenMatchEmail(u.email),
      fullName: u.fullName.trim() || u.email.split("@")[0] || String(u.id),
    };
  }
  return { fetchedAt: new Date().toISOString(), byUserId };
}

function listConfiguredSpaceIds(): number[] {
  const cfg = getKaitenEnvConfig();
  if (!cfg) return [];
  const ids = new Set<number>();
  for (const lane of ["ORTHOPEDICS", "ORTHODONTICS", "TEST"] as const) {
    const t = cfg.boardByLane[lane];
    if (t?.spaceId != null && Number.isFinite(t.spaceId)) ids.add(t.spaceId);
  }
  return [...ids];
}

async function readDirectoryCache(
  db: PrismaClient,
  tenantId: string,
): Promise<DirectoryCache | null> {
  const row = await db.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KAITEN_USERS_DIRECTORY_KEY } },
    select: { value: true },
  });
  return parseDirectoryCache(row?.value ?? null);
}

async function writeDirectoryCache(
  db: PrismaClient,
  tenantId: string,
  cache: DirectoryCache,
): Promise<void> {
  await db.tenantClientState.upsert({
    where: { tenantId_key: { tenantId, key: KAITEN_USERS_DIRECTORY_KEY } },
    create: { tenantId, key: KAITEN_USERS_DIRECTORY_KEY, value: cache as never },
    update: { value: cache as never },
  });
}

/** Загружает справочник Kaiten users (кэш 24ч, один fetch на space). Только background (`burst: false`). */
export async function loadKaitenUsersDirectory(
  db: PrismaClient,
  tenantId: string,
  auth: KaitenAuth,
): Promise<DirectoryCache> {
  const cached = await readDirectoryCache(db, tenantId);
  if (cached) {
    const age = Date.now() - Date.parse(cached.fetchedAt);
    if (Number.isFinite(age) && age >= 0 && age < KAITEN_USERS_DIRECTORY_TTL_MS) {
      return cached;
    }
  }

  const merged: DirectoryCache = {
    fetchedAt: new Date().toISOString(),
    byUserId: { ...(cached?.byUserId ?? {}) },
  };
  for (const spaceId of listConfiguredSpaceIds()) {
    const res = await kaitenListSpaceUsers(auth, spaceId, { burst: false });
    if (!res.ok) continue;
    for (const u of res.users) {
      merged.byUserId[String(u.id)] = {
        email: normalizeKaitenMatchEmail(u.email),
        fullName: u.fullName.trim() || u.email.split("@")[0] || String(u.id),
      };
    }
  }
  await writeDirectoryCache(db, tenantId, merged);
  return merged;
}

export type ResolveKaitenMemberResult =
  | { ok: true; crmUserId: string }
  | { ok: false; reason: "unmapped"; label: string };

async function cacheKaitenUserIdOnUser(
  db: PrismaClient,
  tenantId: string,
  crmUserId: string,
  kaitenUserId: number,
): Promise<void> {
  await db.user.updateMany({
    where: { id: crmUserId, tenantId, kaitenUserId: null },
    data: { kaitenUserId },
  });
}

/** Kaiten member → CRM User.id (email primary, затем User.kaitenUserId). */
export async function resolveKaitenMemberToCrmUser(
  db: PrismaClient,
  tenantId: string,
  member: {
    userId: number;
    email?: string;
    fullName?: string;
  },
  directory: DirectoryCache,
): Promise<ResolveKaitenMemberResult> {
  const dirRow = directory.byUserId[String(member.userId)];
  const email = normalizeKaitenMatchEmail(member.email ?? dirRow?.email);
  const label =
    member.fullName?.trim() ||
    dirRow?.fullName ||
    email ||
    `user-${member.userId}`;

  const byKaitenId = await db.user.findFirst({
    where: { tenantId, isActive: true, kaitenUserId: member.userId },
    select: { id: true },
  });
  if (byKaitenId) return { ok: true, crmUserId: byKaitenId.id };

  if (email) {
    const byEmail = await db.user.findFirst({
      where: { tenantId, isActive: true, email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (byEmail) {
      await cacheKaitenUserIdOnUser(db, tenantId, byEmail.id, member.userId);
      return { ok: true, crmUserId: byEmail.id };
    }
  }

  return {
    ok: false,
    reason: "unmapped",
    label: email ? `${label} (${email})` : label,
  };
}

export type ResolveCrmToKaitenResult =
  | { ok: true; kaitenUserId: number }
  | { ok: false; error: string };

/** CRM User.id → Kaiten user_id для outbound push. */
export async function resolveCrmUserToKaitenUser(
  db: PrismaClient,
  tenantId: string,
  crmUserId: string,
  auth: KaitenAuth,
): Promise<ResolveCrmToKaitenResult> {
  const user = await db.user.findFirst({
    where: { id: crmUserId.trim(), tenantId, isActive: true },
    select: { id: true, email: true, displayName: true, kaitenUserId: true },
  });
  if (!user) {
    return { ok: false, error: "Пользователь CRM не найден" };
  }
  if (user.kaitenUserId != null && Number.isFinite(user.kaitenUserId)) {
    return { ok: true, kaitenUserId: user.kaitenUserId };
  }

  const directory = await loadKaitenUsersDirectory(db, tenantId, auth);
  const email = normalizeKaitenMatchEmail(user.email);
  for (const [kid, row] of Object.entries(directory.byUserId)) {
    if (row.email === email) {
      const n = Number(kid);
      if (Number.isFinite(n)) {
        await cacheKaitenUserIdOnUser(db, tenantId, user.id, n);
        return { ok: true, kaitenUserId: n };
      }
    }
  }

  return {
    ok: false,
    error: `Нет пользователя Kaiten с email ${user.email}`,
  };
}
