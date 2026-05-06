import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { canConfigureTenantAdminMessenger } from "@/lib/tenant-admin-messenger-access";

export const dynamic = "force-dynamic";

export async function POST() {
  const s = await getSessionFromCookies();
  if (!s?.sub || s.demo) {
    return NextResponse.json({ error: "Требуется вход (не демо)" }, { status: 401 });
  }
  if (!canConfigureTenantAdminMessenger(s.role as UserRole)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(s);
  } catch {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 400 });
  }

  const prisma = await getPrisma();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      adminSharedTelegramChatId: null,
      adminSharedTelegramUsername: null,
    },
  });

  return NextResponse.json({ ok: true });
}
