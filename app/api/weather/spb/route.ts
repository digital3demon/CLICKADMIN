import { NextResponse } from "next/server";
import { fetchSpbSkyFromOpenMeteo } from "@/lib/spb-open-meteo";

/**
 * Текущее «небо» для Санкт-Петербурга (Open-Meteo, без ключа).
 * Кэш ~10 мин на сервере + заголовок CDN/браузера.
 */
export async function GET() {
  try {
    const payload = await fetchSpbSkyFromOpenMeteo();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
      },
    });
  } catch {
    return NextResponse.json(
      {
        kind: "clear" as const,
        cloudCoverPercent: 0,
        observationTime: null,
        fallback: true,
      },
      { status: 200 },
    );
  }
}
