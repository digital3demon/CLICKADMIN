import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { jsonResponseIfAuthSecretMissing } from "@/lib/auth/require-auth-secret";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import {
  telegramIdString,
  verifyTelegramWidgetAuth,
} from "@/lib/auth/telegram-widget";
import { getPrisma } from "@/lib/get-prisma";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { canConfigureTenantAdminMessenger } from "@/lib/tenant-admin-messenger-access";

export const dynamic = "force-dynamic";

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

/** Привязка общего Telegram организации (виджет Login), без пользователя CRM. */
export async function POST(req: Request) {
  if (isSingleUserPortable()) {
    return NextResponse.json(
      { error: "В однопользовательском режиме недоступно" },
      { status: 403 },
    );
  }

  const secretMissing = jsonResponseIfAuthSecretMissing();
  if (secretMissing) return secretMissing;

  const token = botToken();
  if (!token) {
    return NextResponse.json(
      { error: "Не задан TELEGRAM_BOT_TOKEN на сервере" },
      { status: 503 },
    );
  }

  const session = await getSessionFromCookies();
  if (!session?.sub || session.demo) {
    return NextResponse.json({ error: "Требуется вход (не демо)" }, { status: 401 });
  }
  if (!canConfigureTenantAdminMessenger(session.role as UserRole)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(session);
  } catch {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 400 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const auth = verifyTelegramWidgetAuth(raw, token);
  if (!auth) {
    return NextResponse.json(
      { error: "Неверная или устаревшая подпись Telegram" },
      { status: 401 },
    );
  }

  const tid = telegramIdString(auth.id);

  const prisma = await getPrisma();

  const userUsing = await prisma.user.findFirst({
    where: { telegramId: tid },
    select: { id: true },
  });
  if (userUsing) {
    return NextResponse.json(
      {
        error:
          "Этот Telegram уже привязан к учётной записи пользователя. Отвяжите в профиле или используйте другой аккаунт.",
      },
      { status: 409 },
    );
  }

  const otherTenant = await prisma.tenant.findFirst({
    where: {
      adminSharedTelegramChatId: tid,
      NOT: { id: tenantId },
    },
    select: { id: true },
  });
  if (otherTenant) {
    return NextResponse.json(
      { error: "Этот Telegram уже привязан как общий админский чат в другой организации." },
      { status: 409 },
    );
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      adminSharedTelegramChatId: tid,
      adminSharedTelegramUsername: auth.username?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true });
}
