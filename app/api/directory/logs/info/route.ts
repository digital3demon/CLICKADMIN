import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getCrmLogDir, listAvailableCrmLogDays } from "@/lib/server/log-dir";

export const dynamic = "force-dynamic";

/** Метаданные файлов логов на диске (только владелец). */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (session.role !== "OWNER") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const days = listAvailableCrmLogDays();
  return NextResponse.json(
    {
      logDir: getCrmLogDir(),
      days,
      oldestDay: days[0] ?? null,
      newestDay: days.at(-1) ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
