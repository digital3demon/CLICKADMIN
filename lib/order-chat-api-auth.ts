import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { canAccessOrderChat } from "@/lib/auth/permissions";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";

/** 403, если у роли нет ORDERS_CHAT; иначе null. */
export async function orderChatAccessDeniedResponse(
  tenantId: string | null | undefined,
  role: UserRole | undefined,
): Promise<NextResponse | null> {
  if (!role) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const access = tenantId
    ? await getEffectiveModuleAccess(tenantId, role)
    : null;
  if (!canAccessOrderChat(role, access ?? undefined)) {
    return NextResponse.json(
      { error: "Нет доступа к чату наряда" },
      { status: 403 },
    );
  }
  return null;
}
