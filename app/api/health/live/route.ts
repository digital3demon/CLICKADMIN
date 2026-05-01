import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Только liveness: процесс слушает HTTP, без БД.
 * Для PaaS/Docker, где probe должен быстро получить 200, пока БД ещё не готова
 * или DATABASE_URL временно неверен (полная проверка — GET /api/health).
 */
export async function GET() {
  return NextResponse.json(
    { status: "live", uptimeSeconds: Math.floor(process.uptime()) },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
