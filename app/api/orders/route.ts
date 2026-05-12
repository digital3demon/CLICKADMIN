import { after, NextResponse } from "next/server";
import {
  getClientsPrisma,
  getOrdersPrisma,
  getPricingPrisma,
} from "@/lib/get-domain-prisma";
import { fetchOrdersListPage } from "@/lib/fetch-orders-list-page";
import { clampOrdersPageSize } from "@/lib/orders-list-cursor";
import { ordersListCreatedAtPeriod } from "@/lib/orders-list-period";
import { normalizeOrdersSearchQuery } from "@/lib/orders-list-query";
import { withApiTiming } from "@/lib/server/api-timing";
import { logger } from "@/lib/server/logger";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { syncNewOrderToKaiten } from "@/lib/kaiten-order-sync";
import { syncUnpushedOrderAttachmentsToKaiten } from "@/lib/kaiten-sync";
import {
  createOrderFromBody,
  type CreateOrderBody,
  shouldScheduleKaitenSyncAfterOrderCreate,
} from "@/lib/order-create-service";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";

/** Ответ: { orders, nextCursor }. Параметры: limit (1–200, по умолчанию 80), cursor (base64url). */
export async function GET(req: Request) {
  const prisma = await getOrdersPrisma();
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
        ordersListForUserId: s.sub,
        viewerRole: s.role,
        viewerUserId: s.sub,
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
  const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
    getPricingPrisma(),
  ]);
  return withApiTiming({ method: "POST", path: "/api/orders" }, async () => {
    try {
      const s = await getSessionFromCookies();
      if (!s) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      const tenantId = await requireSessionTenantId(s);
      const moduleAccess = await getEffectiveModuleAccess(s.tid, s.role);
      if (moduleAccess.ORDERS_CREATE !== true) {
        return NextResponse.json(
          { error: "Недостаточно прав для создания заказа" },
          { status: 403 },
        );
      }
      const body = (await req.json()) as CreateOrderBody;
      if (body.isTestOrder === true && s.role !== "OWNER") {
        return NextResponse.json(
          { error: "Тестовый наряд доступен только владельцу" },
          { status: 403 },
        );
      }
      const result = await createOrderFromBody(
        { ordersPrisma, clientsPrisma, pricingPrisma },
        body,
        { tenantId, actorUserId: s.sub },
      );
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }
      const orderId = result.order.id;
      if (shouldScheduleKaitenSyncAfterOrderCreate(body)) {
        after(async () => {
          const maxKaitenAttempts = 3;
          for (let attempt = 0; attempt < maxKaitenAttempts; attempt++) {
            let syncResult: Awaited<ReturnType<typeof syncNewOrderToKaiten>>;
            try {
              syncResult = await syncNewOrderToKaiten(orderId);
            } catch (e) {
              logger.error(
                { err: e, msg: "kaiten_sync_after_create_deferred", attempt },
                "POST /api/orders",
              );
              if (attempt === maxKaitenAttempts - 1) break;
              await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
              continue;
            }
            if (syncResult.ok) {
              invalidateKaitenSnapshotCache(orderId);
              try {
                await syncUnpushedOrderAttachmentsToKaiten(
                  orderId,
                  ordersPrisma,
                );
              } catch (e) {
                logger.error(
                  { err: e, msg: "order_attachments_kaiten_after_create" },
                  "POST /api/orders",
                );
              }
              break;
            }
            logger.info(
              {
                msg: "kaiten_sync_after_create_deferred",
                attempt,
                err: syncResult.error,
              },
              "POST /api/orders",
            );
            if (attempt < maxKaitenAttempts - 1) {
              await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            }
          }
        });
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
