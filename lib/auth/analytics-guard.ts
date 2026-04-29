import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { canAccessFinancialAnalytics } from "@/lib/auth/permissions";
import type { SessionClaims } from "@/lib/auth/jwt";

export async function requireFinancialAnalytics(): Promise<
  SessionClaims | NextResponse
> {
  const { session: s, access } = await getSessionWithModuleAccess();
  if (!s) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canAccessFinancialAnalytics(s.role, access ?? undefined)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  return s;
}
