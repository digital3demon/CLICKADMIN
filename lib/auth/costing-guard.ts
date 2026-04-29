import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { canAccessCostingModule } from "@/lib/auth/permissions";
import type { SessionClaims } from "@/lib/auth/jwt";

/** Модуль просчёта: владелец или выданный доступ в «Пользователи → доступ». */
export async function requireCostingOwner(): Promise<SessionClaims | NextResponse> {
  const { session: s, access } = await getSessionWithModuleAccess();
  if (!s) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canAccessCostingModule(s.role, access ?? undefined)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  return s;
}
