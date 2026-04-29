import { NextResponse } from "next/server";

/**
 * Вход через Telegram отключён: используйте почту и пароль.
 * Привязка бота — в профиле («Справочники → Профиль»).
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Вход через Telegram отключён. Войдите по почте и паролю; привязку Telegram для уведомлений настройте в профиле.",
      code: "TELEGRAM_LOGIN_DISABLED",
    },
    { status: 403 },
  );
}
