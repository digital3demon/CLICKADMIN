import "server-only";
import type { AppModule, UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable, SINGLE_USER_SESSION } from "@/lib/auth/single-user";
import {
  getEffectiveModuleAccess,
  moduleAccessForResponse,
} from "@/lib/role-module-resolver";

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
};

/** Снимок сессии для первого кадра клиента (без ожидания /api/auth/session). */
export async function getClientSessionBootstrap(): Promise<ClientSessionBootstrap> {
  if (isSingleUserPortable()) {
    const mod = await getEffectiveModuleAccess(SINGLE_USER_SESSION.tid, SINGLE_USER_SESSION.role);
    return {
      singleUser: true,
      demo: false,
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
    return { singleUser: false, demo: false, user: null };
  }

  const mod = await getEffectiveModuleAccess(s.tid, s.role);
  return {
    singleUser: false,
    demo: Boolean(s.demo),
    user: {
      id: s.sub,
      email: s.email,
      displayName: s.name,
      role: s.role,
      actualRole: s.actualRole ?? s.role,
      avatarPresetId: null,
      avatarCustomUploadedAt: null,
      moduleAccess: moduleAccessForResponse(mod) as Partial<
        Record<AppModule, boolean>
      >,
    },
  };
}
