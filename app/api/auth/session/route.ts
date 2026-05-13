import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { getPrisma } from "@/lib/get-prisma";
import { getEffectiveModuleAccess, moduleAccessForResponse } from "@/lib/role-module-resolver";
import {
  getSessionTenantRouting,
  getTenantIdForSession,
} from "@/lib/auth/tenant-for-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s) {
    return NextResponse.json({ user: null, singleUser: isSingleUserPortable() });
  }

  let avatarPresetId: string | null = null;
  let mentionHandle: string | null = null;
  let avatarCustomUploadedAt: string | null = null;
  /** Актуальное имя из БД; JWT (`s.name`) при сохранении профиля не переписывается. */
  let displayNameFromDb: string | null = null;
  let tenantDatabaseEnabled = false;
  let tenantDatabaseReady = false;
  let kanbanAdminMentionTag: string | null = null;
  try {
    const db = await getPrisma();
    const row = await db.user.findUnique({
      where: { id: s.sub },
      select: {
        displayName: true,
        avatarPresetId: true,
        mentionHandle: true,
        avatarCustomUploadedAt: true,
      },
    });
    displayNameFromDb = row?.displayName?.trim() ? row.displayName.trim() : null;
    avatarPresetId = row?.avatarPresetId ?? null;
    mentionHandle = row?.mentionHandle ?? null;
    avatarCustomUploadedAt = row?.avatarCustomUploadedAt?.toISOString() ?? null;
    const tid = await getTenantIdForSession(s);
    if (tid) {
      const tenantRow = await db.tenant.findUnique({
        where: { id: tid },
        select: { kanbanAdminMentionTag: true },
      });
      const raw = tenantRow?.kanbanAdminMentionTag?.trim();
      kanbanAdminMentionTag = raw ? raw : null;
    }
  } catch {
    /* prisma / колонки — игнорируем, сессия всё равно валидна */
  }
  const routing = await getSessionTenantRouting(s).catch(() => null);
  if (routing) {
    tenantDatabaseEnabled = routing.tenantDatabaseEnabled;
    tenantDatabaseReady = routing.tenantDatabaseReady;
  }

  const mod = await getEffectiveModuleAccess(s.tid, s.role);
  return NextResponse.json({
    user: {
      id: s.sub,
      email: s.email,
      displayName: displayNameFromDb ?? s.name,
      role: s.role,
      actualRole: s.actualRole ?? s.role,
      viewAsRole: s.actualRole ? s.role : null,
      avatarPresetId,
      mentionHandle,
      avatarCustomUploadedAt,
      tenantDatabaseEnabled,
      tenantDatabaseReady,
      moduleAccess: moduleAccessForResponse(mod),
    },
    tenant: {
      kanbanAdminMentionTag,
    },
    singleUser: isSingleUserPortable(),
    demo: Boolean(s.demo),
  });
}
