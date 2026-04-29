import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { canAccessCostingModule } from "@/lib/auth/permissions";
import type { SessionClaims } from "@/lib/auth/jwt";

/** Модуль просчёта себестоимости: пока только владелец. */
export async function requireCostingOwner(): Promise<SessionClaims | NextResponse> {
  const s = await getSessionFromCookies();
  if (!s) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canAccessCostingModule(s.role)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  return s;
}
