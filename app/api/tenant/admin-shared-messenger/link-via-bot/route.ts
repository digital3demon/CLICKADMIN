import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { canConfigureTenantAdminMessenger } from "@/lib/tenant-admin-messenger-access";
import { createAdminSharedMessengerBotStartToken } from "@/lib/admin-shared-messenger-bot-link";

export const dynamic = "force-dynamic";

function botUsername(): string | null {
  const raw = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME?.trim() ?? "";
  const normalized = raw
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^t\.me\//i, "")
    .replace(/^@+/, "")
    .trim();
  if (!normalized) return null;
  return normalized;
}

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
  const bot = botUsername();
  if (!bot) {
    return NextResponse.json(
      { error: "Не задан NEXT_PUBLIC_TELEGRAM_BOT_NAME" },
      { status: 503 },
    );
  }
  const token = createAdminSharedMessengerBotStartToken(tenantId);
  if (!token) {
    return NextResponse.json(
      { error: "Не задан AUTH_SECRET (минимум 16 символов)" },
      { status: 503 },
    );
  }
  const deepLink = `https://t.me/${encodeURIComponent(bot)}?start=${encodeURIComponent(token)}`;
  return NextResponse.json({
    ok: true,
    deepLink,
    command: `/start ${token}`,
    ttlMinutes: 10,
  });
}

