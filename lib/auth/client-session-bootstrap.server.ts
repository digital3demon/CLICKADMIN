import "server-only";
import type { AppModule, UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  isSingleUserBlockedInProduction,
  isSingleUserPortable,
  SINGLE_USER_SESSION,
} from "@/lib/auth/single-user";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  getEffectiveModuleAccess,
  moduleAccessForResponse,
} from "@/lib/role-module-resolver";
import { normalizeKanbanAdminMentionTag } from "@/lib/kanban-admin-mention";

export type ClientSessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  actualRole: UserRole;
  avatarPresetId: string | null;
  avatarCustomUploadedAt: string | null;
  moduleAccess: Partial<Record<AppModule, boolean>>;
};

export type ClientSessionBootstrap = {
  singleUser: boolean;
  demo: boolean;
  user: ClientSessionUser | null;
  /** Тег @… админской группы (Tenant.kanbanAdminMentionTag). */
  kanbanAdminMentionTag: string | null;
};

/** Снимок сессии для первого кадра клиента (без ожидания /api/auth/session). */
export async function getClientSessionBootstrap(): Promise<ClientSessionBootstrap> {
  if (isSingleUserPortable() && !isSingleUserBlockedInProduction()) {
    const mod = await getEffectiveModuleAccess(SINGLE_USER_SESSION.tid, SINGLE_USER_SESSION.role);
    return {
      singleUser: true,
      demo: false,
      kanbanAdminMentionTag: null,
      user: {
        id: SINGLE_USER_SESSION.sub,
        email: SINGLE_USER_SESSION.email,
        displayName: SINGLE_USER_SESSION.name,
        role: SINGLE_USER_SESSION.role,
        actualRole: SINGLE_USER_SESSION.role,
        avatarPresetId: null,
        avatarCustomUploadedAt: null,
        moduleAccess: moduleAccessForResponse(mod) as Partial<
          Record<AppModule, boolean>
        >,
      },
    };
  }

  const s = await getSessionFromCookies();
  if (!s) {
    return {
      singleUser: false,
      demo: false,
      user: null,
      kanbanAdminMentionTag: null,
    };
  }

  const [mod, tid] = await Promise.all([
    getEffectiveModuleAccess(s.tid, s.role),
    getTenantIdForSession(s).catch(() => s.tid ?? null),
  ]);

  let kanbanAdminMentionTag: string | null = null;
  let avatarPresetId: string | null = null;
  let avatarCustomUploadedAt: string | null = null;
  try {
    const db = await getPrisma();
    const [tenantRow, userRow] = await Promise.all([
      tid
        ? db.tenant.findUnique({
            where: { id: tid },
            select: { kanbanAdminMentionTag: true },
          })
        : Promise.resolve(null),
      db.user.findUnique({
        where: { id: s.sub },
        select: {
          avatarPresetId: true,
          avatarCustomUploadedAt: true,
        },
      }),
    ]);
    kanbanAdminMentionTag = tenantRow?.kanbanAdminMentionTag?.trim()
      ? normalizeKanbanAdminMentionTag(tenantRow.kanbanAdminMentionTag)
      : null;
    avatarPresetId = userRow?.avatarPresetId ?? null;
    avatarCustomUploadedAt =
      userRow?.avatarCustomUploadedAt?.toISOString() ?? null;
  } catch {
    kanbanAdminMentionTag = null;
  }

  return {
    singleUser: false,
    demo: Boolean(s.demo),
    kanbanAdminMentionTag,
    user: {
      id: s.sub,
      email: s.email,
      displayName: s.name,
      role: s.role,
      actualRole: s.actualRole ?? s.role,
      avatarPresetId,
      avatarCustomUploadedAt,
      moduleAccess: moduleAccessForResponse(mod) as Partial<
        Record<AppModule, boolean>
      >,
    },
  };
}
