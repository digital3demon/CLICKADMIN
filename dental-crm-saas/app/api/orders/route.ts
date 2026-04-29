import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { fetchOrdersListPage } from "@/lib/fetch-orders-list-page";
import { clampOrdersPageSize } from "@/lib/orders-list-cursor";
import { ordersListCreatedAtPeriod } from "@/lib/orders-list-period";
import { normalizeOrdersSearchQuery } from "@/lib/orders-list-query";
import { withApiTiming } from "@/lib/server/api-timing";
import { logger } from "@/lib/server/logger";
import {
  createOrderFromBody,
  type CreateOrderBody,
} from "@/lib/order-create-service";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";

/** Ответ: { orders, nextCursor }. Параметры: limit (1–200, по умолчанию 80), cursor (base64url). */
export async function GET(req: Request) {
  const prisma = await getPrisma();
  return withApiTiming({ method: "GET", path: "/api/orders" }, async () => {
    try {
      const s = await getSessionFromCookies();
      if (!s) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      const tenantId = await requireSessionTenantId(s);
      const url = new URL(req.url);
      const pageSize = clampOrdersPageSize(url.searchParams.get("limit"));
      const cursor = url.searchParams.get("cursor");
      const tag = url.searchParams.get("tag");
      const onlyShipped =
        url.searchParams.get("onlyShipped") === "1" ||
        url.searchParams.get("onlyShipped") === "true";
      const hideShipped =
        !onlyShipped &&
        (url.searchParams.get("hideShipped") === "1" ||
          url.searchParams.get("hideShipped") === "true");
      const search = normalizeOrdersSearchQuery(url.searchParams.get("q"));
      const fromSp = url.searchParams.get("from");
      const toSp = url.searchParams.get("to");
      const period = ordersListCreatedAtPeriod(fromSp, toSp);
      const createdAtRange =
        period.mode === "range"
          ? { start: period.start, endExclusive: period.endExclusive }
          : undefined;
      const { orders, nextCursor } = await fetchOrdersListPage(prisma, {
        tenantId,
        cursor,
        pageSize,
        tag,
        hideShipped: hideShipped || undefined,
        onlyShipped: onlyShipped || undefined,
        search: search || undefined,
        createdAtRange,
      });
      return NextResponse.json({ orders, nextCursor });
    } catch (e) {
      logger.error({ err: e, msg: "orders_list_failed" }, "GET /api/orders");
      return NextResponse.json(
        { error: "Не удалось загрузить заказы" },
        { status: 500 },
      );
    }
  });
}

export async function POST(req: Request) {
  const prisma = await getPrisma();
  return withApiTiming({ method: "POST", path: "/api/orders" }, async () => {
    try {
      const s = await getSessionFromCookies();
      if (!s) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      const tenantId = await requireSessionTenantId(s);
      const body = (await req.json()) as CreateOrderBody;
      const result = await createOrderFromBody(prisma, body, { tenantId });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }
      return NextResponse.json(result.order);
    } catch (e) {
      logger.error({ err: e, msg: "order_create_failed" }, "POST /api/orders");
      return NextResponse.json(
        { error: "Не удалось сохранить заказ" },
        { status: 500 },
      );
    }
  });
}
