import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { buildTelegramConnectivityDiagnostic } from "@/lib/telegram-connectivity-diagnostic.server";

export const dynamic = "force-dynamic";

/**
 * Диагностика Telegram Bot API с хоста CRM (без секретов).
 * Только OWNER — для экрана Конфигурация → Telegram.
 */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.role !== "OWNER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const report = await buildTelegramConnectivityDiagnostic();
  return NextResponse.json(
    { ok: true, report },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
