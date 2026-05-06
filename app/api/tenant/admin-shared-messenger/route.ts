import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import type { AdminSharedMessengerNotifyKey } from "@/lib/admin-shared-messenger-prefs";
import {
  mergeAdminSharedMessengerNotifyPrefs,
  parseAdminSharedMessengerNotifyPrefsPatch,
} from "@/lib/admin-shared-messenger-prefs";
import { getPrisma } from "@/lib/get-prisma";
import { canConfigureTenantAdminMessenger } from "@/lib/tenant-admin-messenger-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
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
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      adminSharedTelegramChatId: true,
      adminSharedTelegramUsername: true,
      adminSharedMessengerNotifyPrefs: true,
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  }

  return NextResponse.json({
    linked: Boolean(row.adminSharedTelegramChatId?.trim()),
    telegramUsername: row.adminSharedTelegramUsername ?? null,
    notifyPrefs: mergeAdminSharedMessengerNotifyPrefs(
      row.adminSharedMessengerNotifyPrefs,
    ),
  });
}

export async function PATCH(req: Request) {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (s.demo) {
    return NextResponse.json({ error: "В демо недоступно" }, { status: 403 });
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

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = parseAdminSharedMessengerNotifyPrefsPatch(
    body.adminSharedMessengerNotifyPrefs,
  );
  if (parsed === null) {
    return NextResponse.json(
      { error: "Некорректные настройки уведомлений" },
      { status: 400 },
    );
  }

  const prisma = await getPrisma();
  const cur = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { adminSharedMessengerNotifyPrefs: true },
  });
  const merged = mergeAdminSharedMessengerNotifyPrefs(
    cur?.adminSharedMessengerNotifyPrefs,
  );
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === "boolean") {
      merged[k as AdminSharedMessengerNotifyKey] = v;
    }
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      adminSharedMessengerNotifyPrefs: merged as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    ok: true,
    notifyPrefs: merged,
  });
}
