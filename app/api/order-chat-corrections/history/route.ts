import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { correctionHistoryRowToJson } from "@/lib/corrections-history";
import { loadCorrectionsHistoryOnly } from "@/lib/corrections-history.server";

export const dynamic = "force-dynamic";

/** Последние корректировки «!!!» для модалки в списке нарядов. */
export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (access?.ORDERS !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const items = await loadCorrectionsHistoryOnly({ limit: 80 });

  return NextResponse.json(
    {
      count: items.length,
      items: items.map(correctionHistoryRowToJson),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
