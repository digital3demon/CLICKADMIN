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

  const db = await getPrisma();
  const tid = s.tid ?? (await getTenantIdForSession(s).catch(() => null));

  const [row, routing, mod, tenantRow] = await Promise.all([
    db.user
      .findUnique({
        where: { id: s.sub },
        select: {
          displayName: true,
          avatarPresetId: true,
          mentionHandle: true,
          avatarCustomUploadedAt: true,
        },
      })
      .catch(() => null),
    getSessionTenantRouting(s).catch(() => null),
    getEffectiveModuleAccess(s.tid, s.role),
    tid
      ? db.tenant
          .findUnique({
            where: { id: tid },
            select: { kanbanAdminMentionTag: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const displayNameFromDb = row?.displayName?.trim() ? row.displayName.trim() : null;
  const kanbanAdminMentionTag = tenantRow?.kanbanAdminMentionTag?.trim() || null;

  return NextResponse.json({
    user: {
      id: s.sub,
      email: s.email,
      displayName: displayNameFromDb ?? s.name,
      role: s.role,
      actualRole: s.actualRole ?? s.role,
      viewAsRole: s.actualRole ? s.role : null,
      avatarPresetId: row?.avatarPresetId ?? null,
      mentionHandle: row?.mentionHandle ?? null,
      avatarCustomUploadedAt: row?.avatarCustomUploadedAt?.toISOString() ?? null,
      tenantDatabaseEnabled: routing?.tenantDatabaseEnabled ?? false,
      tenantDatabaseReady: routing?.tenantDatabaseReady ?? false,
      moduleAccess: moduleAccessForResponse(mod),
    },
    tenant: {
      kanbanAdminMentionTag,
    },
    singleUser: isSingleUserPortable(),
    demo: Boolean(s.demo),
  });
}
