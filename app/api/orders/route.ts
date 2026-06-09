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
import {
  pushKaitenCardTitleForOrderIfLinked,
  pushKaitenHeadForContinuationParents,
} from "@/lib/kaiten-push-order-title";
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
      const actualRole = s.actualRole ?? s.role;
      if (actualRole !== "OWNER" && moduleAccess.ORDERS_CREATE !== true) {
        return NextResponse.json(
          { error: "Недостаточно прав для создания заказа" },
          { status: 403 },
        );
      }
      const body = (await req.json()) as CreateOrderBody;
      if (body.isTestOrder === true && actualRole !== "OWNER") {
        return NextResponse.json(
          { error: "Тестовый наряд доступен только владельцу" },
          { status: 403 },
        );
      }
      const result = await createOrderFromBody(
        { ordersPrisma, clientsPrisma, pricingPrisma },
        body,
        { tenantId, actorUserId: s.sub, actorRole: s.role },
      );
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }
      const orderId = result.order.id;
      if (result.order.continuesFromOrderId) {
        void pushKaitenHeadForContinuationParents([
          result.order.continuesFromOrderId,
        ]);
      }
      if (shouldScheduleKaitenSyncAfterOrderCreate(body)) {
        const syncKaiten = async (): Promise<string | null> => {
          const maxKaitenAttempts = 3;
          let lastError: string | null = null;
          for (let attempt = 0; attempt < maxKaitenAttempts; attempt++) {
            let syncResult: Awaited<ReturnType<typeof syncNewOrderToKaiten>>;
            try {
              syncResult = await syncNewOrderToKaiten(orderId);
            } catch (e) {
              logger.error(
                { err: e, msg: "kaiten_sync_after_create_deferred", attempt },
                "POST /api/orders",
              );
              lastError = e instanceof Error ? e.message : String(e);
              if (attempt === maxKaitenAttempts - 1) break;
              await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
              continue;
            }
            if (syncResult.ok) {
              invalidateKaitenSnapshotCache(orderId);
              try {
                const push = await pushKaitenCardTitleForOrderIfLinked(orderId);
                if (!push.ok) {
                  logger.error(
                    { err: push.error, msg: "kaiten_head_after_create" },
                    "POST /api/orders",
                  );
                }
              } catch (e) {
                logger.error(
                  { err: e, msg: "kaiten_head_after_create" },
                  "POST /api/orders",
                );
              }
              try {
                const row = await ordersPrisma.order.findUnique({
                  where: { id: orderId },
                  select: { continuesFromOrderId: true },
                });
                if (row?.continuesFromOrderId) {
                  await pushKaitenHeadForContinuationParents([
                    row.continuesFromOrderId,
                  ]);
                }
              } catch (e) {
                logger.error(
                  { err: e, msg: "kaiten_parent_after_child_create" },
                  "POST /api/orders",
                );
              }
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
              return null;
            }
            lastError = syncResult.error ?? "Не удалось создать карточку Kaiten";
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
          return lastError ?? "Не удалось создать карточку Kaiten";
        };

        if (body.waitForKaitenBeforePrint === true) {
          const kaitenPrintSyncError = await syncKaiten();
          if (kaitenPrintSyncError) {
            return NextResponse.json({
              ...result.order,
              kaitenPrintSyncError,
            });
          }
        } else {
          after(syncKaiten);
        }
      }
      return NextResponse.json({
        ...result.order,
        ...(result.autoReply ? { autoReply: result.autoReply } : {}),
      });
    } catch (e) {
      logger.error({ err: e, msg: "order_create_failed" }, "POST /api/orders");
      return NextResponse.json(
        { error: "Не удалось сохранить заказ" },
        { status: 500 },
      );
    }
  });
}
