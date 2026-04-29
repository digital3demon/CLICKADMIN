import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  advanceOrderPostingMonth,
  computeNextOrderNumber,
  getOrCreateOrderNumberSettings,
  postingMonthLabelRu,
  setManualNextOrderNumber,
} from "@/lib/order-number";

/** Текущий месяц нумерации и следующий номер (для формы нового наряда и страницы заказов). */
export async function GET() {
  try {
    const s = await getSessionFromCookies();
    if (!s) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(s);
    const prisma = await getPrisma();
    const { postingYearMonth } = await getOrCreateOrderNumberSettings(
      prisma,
      tenantId,
    );
    const nextOrderNumber = await computeNextOrderNumber(prisma, tenantId);
    return NextResponse.json(
      {
        postingYearMonth,
        postingMonthLabel: postingMonthLabelRu(postingYearMonth),
        nextOrderNumber,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=3, stale-while-revalidate=15",
        },
      },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить настройки нумерации" },
      { status: 500 },
    );
  }
}

/**
 * Перевести нумерацию на следующий календарный месяц.
 * Пока не нажали — новые наряды получают номера в прежнем YYMM (можно дозаносить прошлый месяц).
 */
export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(session);

    const prisma = await getPrisma();
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      orderNumber?: string;
    };

    if (body.action === "advanceMonth") {
      const { previousYearMonth, nextYearMonth } =
        await advanceOrderPostingMonth(prisma, tenantId);
      const nextOrderNumber = await computeNextOrderNumber(prisma, tenantId);
      return NextResponse.json({
        ok: true,
        previousYearMonth,
        postingYearMonth: nextYearMonth,
        nextYearMonth,
        postingMonthLabel: postingMonthLabelRu(nextYearMonth),
        nextOrderNumber,
      });
    }

    if (body.action === "setNextSequence") {
      const raw = body.orderNumber?.trim() ?? "";
      const result = await setManualNextOrderNumber(prisma, raw, tenantId);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const { postingYearMonth } = await getOrCreateOrderNumberSettings(
        prisma,
        tenantId,
      );
      return NextResponse.json({
        ok: true,
        postingYearMonth,
        postingMonthLabel: postingMonthLabelRu(postingYearMonth),
        nextOrderNumber: result.nextOrderNumber,
      });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось выполнить действие" },
      { status: 500 },
    );
  }
}
