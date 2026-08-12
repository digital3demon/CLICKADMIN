import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { countFinanceOfficeQuickFilterChips } from "@/lib/fetch-finance-office-orders";
import { parseFinanceOfficeMode } from "@/lib/finance-office-list-filter";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { parseYmdOrNull } from "@/lib/shipments-date-range";

export const dynamic = "force-dynamic";

/** Счётчики чипов ФинОтдела — отдельно от SSR страницы, чтобы не блокировать открытие списка. */
export async function GET(req: Request) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (access?.FINANCE_OFFICE !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }

  const url = new URL(req.url);
  const mode = parseFinanceOfficeMode(url.searchParams.get("tab"));
  const fromYmd = parseYmdOrNull(url.searchParams.get("from"));
  const toYmd = parseYmdOrNull(url.searchParams.get("to"));
  const q = url.searchParams.get("q")?.trim() || "";
  const listTag = url.searchParams.get("tag")?.trim() || "";

  if (mode === "period" && !toYmd) {
    return NextResponse.json(
      {
        attentionCount: 0,
        prostheticsPendingCount: 0,
        financeNotCalculatedCount: 0,
        financeCalculatedCount: 0,
        edoCount: 0,
        noEdoCount: 0,
        labMentionCount: 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const prisma = await getOrdersPrisma();
  const counts = await countFinanceOfficeQuickFilterChips(prisma, tenantId, {
    search: q,
    userId: session.sub,
    mode,
    fromYmd,
    toYmd,
    listTag: listTag || null,
  });

  return NextResponse.json(counts, {
    headers: { "Cache-Control": "no-store" },
  });
}
