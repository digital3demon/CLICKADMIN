import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { verifyTelegramWebAppInitData } from "@/lib/auth/telegram-webapp-init-data";
import { telegramIdString } from "@/lib/auth/telegram-widget";
import { signSessionToken } from "@/lib/auth/jwt";
import { jsonResponseIfAuthSecretMissing } from "@/lib/auth/require-auth-secret";
import {
  clearDemoSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session-cookie";
import {
  SESSION_MISSING_TENANT_ERROR,
  sessionClaimsForUserId,
} from "@/lib/auth/session-claims-for-user";
import {
  DeviceLimitReachedError,
  issueUserDeviceSessionOrThrow,
} from "@/lib/auth/device-session";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { findCrmUserByTelegramIdForBot } from "@/lib/telegram-bot-resolve-user";
import { telegramRoleLinksToOrderPage } from "@/lib/telegram-bot-role-matrix";
import { prisma } from "@/lib/prisma";

type Body = { initData?: string };

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

/** Вход в CRM из Telegram Mini App по initData + привязке User.telegramId. */
export async function POST(req: Request) {
  try {
    if (isSingleUserPortable()) {
      return NextResponse.json(
        { error: "В однопользовательском режиме Mini App недоступен" },
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

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }

    const verified = verifyTelegramWebAppInitData(
      String(body.initData ?? ""),
      token,
    );
    if (!verified) {
      return NextResponse.json(
        { error: "Неверная или устаревшая подпись Telegram" },
        { status: 401 },
      );
    }

    const tid = telegramIdString(verified.userId);
    const linked = await findCrmUserByTelegramIdForBot(tid);
    if (!linked) {
      return NextResponse.json(
        {
          error:
            "Telegram не привязан к пользователю CRM. Откройте профиль в CRM и привяжите аккаунт.",
          code: "not_linked",
        },
        { status: 404 },
      );
    }

    const userRow = await prisma.user.findFirst({
      where: { id: linked.id },
      select: { id: true, isActive: true, role: true, tenantId: true },
    });
    if (!userRow?.isActive) {
      return NextResponse.json(
        { error: "Учётная запись отключена" },
        { status: 403 },
      );
    }

    try {
      await prisma.user.update({
        where: { id: userRow.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (e) {
      console.warn("[auth/telegram-webapp] skip lastLoginAt:", e);
    }

    let sid: string;
    try {
      const issued = await issueUserDeviceSessionOrThrow({
        userId: userRow.id,
        tenantId: userRow.tenantId,
        headers: req.headers,
      });
      sid = issued.sid;
    } catch (e) {
      if (e instanceof DeviceLimitReachedError) {
        return NextResponse.json(
          {
            error:
              "Достигнут лимит устройств для одного пользователя, выйдите с другого устройства",
          },
          { status: 409 },
        );
      }
      throw e;
    }

    const claims = await sessionClaimsForUserId(userRow.id);
    const sessionToken = await signSessionToken({ ...claims, sid });
    const role = (userRow.role ?? linked.role) as UserRole;

    const res = NextResponse.json({
      ok: true,
      role,
      linksToOrderPage: telegramRoleLinksToOrderPage(role),
      userId: userRow.id,
      startParam: verified.startParam ?? null,
    });
    setSessionCookie(res, sessionToken);
    clearDemoSessionCookie(res);
    return res;
  } catch (e) {
    console.error("[auth/telegram-webapp]", e);
    if (e instanceof Error && e.message === SESSION_MISSING_TENANT_ERROR) {
      return NextResponse.json(
        {
          error:
            "У пользователя нет связанной организации в базе. Проверьте миграции (Tenant).",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Ошибка входа через Mini App" },
      { status: 500 },
    );
  }
}
