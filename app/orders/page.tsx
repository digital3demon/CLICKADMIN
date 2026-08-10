import { OrdersPageTitleExtras } from "@/components/orders/OrdersPageTitleExtras";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { OrderKaitenQrModal } from "@/components/orders/OrderKaitenQrModal";
import { OrderListDueCell } from "@/components/orders/OrderListDueCell";
import { OrderListKaitenColumnTag } from "@/components/orders/OrderListKaitenColumnTag";
import { OrderListTagsCell } from "@/components/orders/OrderListTagsCell";
import { OrderListOrderChatCell } from "@/components/orders/OrderListOrderChatCell";
import { OrderListAdminMemoCell } from "@/components/orders/OrderListAdminMemoCell";
import { OrderShippedToggle } from "@/components/orders/OrderShippedToggle";
import { OrderStickerPrintLink } from "@/components/orders/OrderStickerPrintLink";
import { OrdersListKaitenChatShell } from "@/components/orders/OrdersListKaitenChatShell";
import { OrderNarjadPrintTrigger } from "@/components/orders/OrderNarjadPrintTrigger";
import { OrderPostingMonthBar } from "@/components/orders/OrderPostingMonthBar";
import { OrdersListHeaderActionCards } from "@/components/orders/OrdersListHeaderActionCards";
import { OrdersListShippedToolbar } from "@/components/orders/OrdersListShippedToolbar";
import { OrdersListPageSizePref } from "@/components/orders/OrdersListPageSizePref";
import { OrdersListFiltersRow } from "@/components/orders/OrdersListFiltersRow";
import { OrdersListStickySearch } from "@/components/orders/OrdersListStickySearch";
import { OrdersListTableRow } from "@/components/orders/OrdersListTableRow";
import { OrdersListChrome } from "@/components/orders/OrdersListChrome";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { getSiteOrigin } from "@/lib/site-origin-server";
import { fetchOrdersListPage } from "@/lib/fetch-orders-list-page";
import { fetchOrdersShipmentListPage } from "@/lib/fetch-orders-shipment-list-page";
import { countOrdersWithPendingKaitenLabMentionForUser } from "@/lib/order-kaiten-lab-mention-count";
import { orderIdsWithPendingMergedCorrections } from "@/lib/order-chat-corrections-read";
import {
  humanListTagLabel,
  LIST_TAG_KAITEN_LAB_MENTION,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PROSTHETICS_PENDING,
  parseListTagParam,
  relatedOrdersListTagQuickFilters,
  listTagParamsEqual,
  listTagKaitenColumnTitle,
  LIST_TAG_KAITEN_BLOCKED,
} from "@/lib/order-list-tag-filter";
import { resolveOrdersPageSize } from "@/lib/orders-list-cursor";
import { ordersListCreatedAtPeriod } from "@/lib/orders-list-period";
import {
  normalizeOrdersSearchQuery,
  ordersListHref,
} from "@/lib/orders-list-query";
import {
  ordersShipmentModeLabel,
  parseOrdersShipmentParams,
} from "@/lib/orders-shipment-list-query";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { canAcceptOrderChatCorrections, canSeeOrderNotificationKind } from "@/lib/auth/permissions";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import {
  loadProstheticsInTransitForTenant,
  loadProstheticsToOrderForTenant,
} from "@/lib/prosthetics-in-transit.server";
import { countPendingLabTasks } from "@/lib/lab-tasks.server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { loadKaitenIntegrationTenantState } from "@/lib/kaiten-integration/settings";
import { PrismaDataLoadErrorCallout } from "@/components/layout/PrismaDataLoadErrorCallout";
import { ordersSearchWhere } from "@/lib/fetch-orders-list-page";
import { getLabDueHmSlotsForTenant } from "@/lib/get-lab-due-hm-slots-for-tenant";
import { orderTestVisibilityWhere } from "@/lib/order-test-visibility";
import { orderPathById } from "@/lib/order-public-ref";
import { ORDER_SHIPPED_ROW_CLASS } from "@/lib/order-shipped-row-class";
import {
  mergeOrderListRowClass,
  resolveOrderListHarmonyRowState,
  resolveOrderListRowAccentKind,
} from "@/lib/order-list-row-accent";
export const dynamic = "force-dynamic";

/** Контент списка на всю ширину рабочей области (таблица сама делит колонки). */
const ORDERS_MAIN_LAYOUT = "w-full min-w-0 max-w-full";

/** Список занимает всю рабочую ширину, чтобы на разных мониторах не гулял масштаб таблицы. */
const ORDERS_LIST_STACK = "w-full max-w-full min-w-0 self-start space-y-4";

/** Меньше внешних полей, чем у стандартного ModuleFrame — ближе к сайдбару. */
const ORDERS_FRAME_ROOT =
  "!px-2 !pb-6 !pt-4 sm:!px-3 sm:!pb-7 sm:!pt-5 md:!px-4 md:!pb-8 md:!pt-6 lg:!px-4 lg:!pb-9 lg:!pt-7";
const ORDERS_TABLE_TH =
  "min-w-0 whitespace-nowrap px-1 py-1 text-center sm:px-1.5 sm:py-1.5";
const ORDERS_TABLE_CLASS =
  "w-full min-w-[56rem] table-fixed border-collapse text-left text-[10px] sm:text-[11px] md:min-w-[56rem] lg:min-w-0 lg:text-xs 2xl:text-[13px]";

/** Поступление: дата прихода работы; без явной даты — как в наряде: дата занесения в CRM. */
function formatAdmission(o: {
  workReceivedAt: Date | null;
  createdAt: Date;
}): { short: string; full: string } {
  const d = o.workReceivedAt ?? o.createdAt;
  return {
    short: d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    }),
    full: d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  };
}

function formatOrderCardDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function OrdersTableColGroup() {
  return (
    <colgroup>
      <col className="max-md:hidden lg:w-[2.8%]" />
      <col className="max-md:hidden lg:w-[6.5%]" />
      <col className="lg:w-[6%]" />
      <col className="lg:w-[11.5%]" />
      <col className="lg:w-[11%]" />
      <col className="lg:w-[8%]" />
      <col className="lg:w-[7.5%]" />
      <col className="lg:w-[7%]" />
      <col className="lg:w-[4.2%]" />
      <col className="lg:w-[4.2%]" />
      <col className="max-md:hidden lg:w-[6%]" />
      <col className="lg:w-[4.8%]" />
      <col className="lg:w-[14.5%]" />
    </colgroup>
  );
}

function OrdersTableHeaderRow({ isDemo }: { isDemo: boolean }) {
  return (
    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[9px] font-semibold uppercase leading-snug tracking-wide text-[var(--text-secondary)] sm:text-[10px] md:text-xs">
      <th
        className={`${ORDERS_TABLE_TH} max-md:hidden normal-case`}
        title="Чат карточки в Kaiten"
      >
        Чат
      </th>
      <th
        className={`${ORDERS_TABLE_TH} max-md:hidden normal-case`}
        aria-label={
          isDemo
            ? "Печать наряда, этикетки и QR на карточку канбана"
            : "Печать наряда, этикетки и QR на карточку Kaiten"
        }
        title={
          isDemo
            ? "Печать наряда, этикетки и QR на карточку канбана"
            : "Печать наряда, этикетки и QR на карточку Kaiten"
        }
      >
        Печать
      </th>
      <th className={ORDERS_TABLE_TH} title="№ наряда">
        № наряда
      </th>
      <th className={ORDERS_TABLE_TH} title="Клиника">
        Клиника
      </th>
      <th className={ORDERS_TABLE_TH} title="Адрес клиники">
        Адрес
      </th>
      <th className={ORDERS_TABLE_TH} title="Врач">
        Врач
      </th>
      <th className={ORDERS_TABLE_TH} title="Пациент">
        Пациент
      </th>
      <th
        className={ORDERS_TABLE_TH}
        title="Поступление: когда работа зашла в лабораторию (без даты — дата занесения наряда)"
      >
        Поступление
      </th>
      <th className={ORDERS_TABLE_TH} title="Срок лабораторный">
        ЛАБ
      </th>
      <th className={ORDERS_TABLE_TH} title="Запись: дата и время приёма пациента">
        Запись
      </th>
      <th
        className={`${ORDERS_TABLE_TH} max-md:hidden normal-case`}
        title="Пометки смен (не уходят в наряд и Kaiten)"
      >
        Пометки
      </th>
      <th className={ORDERS_TABLE_TH} title="Отправка работы">
        Отправка
      </th>
      <th
        className={`${ORDERS_TABLE_TH} align-top normal-case`}
        title="Теги: нажмите — фильтр списка; «+» — добавить свой тег к наряду"
      >
        Отметки
      </th>
    </tr>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    cursor?: string;
    limit?: string;
    tag?: string;
    hideShipped?: string;
    onlyShipped?: string;
    q?: string;
    from?: string;
    to?: string;
    ship?: string;
    shipFrom?: string;
    shipTo?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await getSessionFromCookies();
  const isDemo = Boolean(session?.demo);
  const siteOrigin = await getSiteOrigin();
  const tenantId = session
    ? await getTenantIdForSession(session)
    : null;
  const canMarkProstheticsArrived =
    session != null && canAcceptOrderChatCorrections(session.role);
  let moduleAccess: Awaited<ReturnType<typeof getEffectiveModuleAccess>> | null =
    null;
  if (session?.role && tenantId) {
    try {
      moduleAccess = await getEffectiveModuleAccess(tenantId, session.role);
    } catch {
      moduleAccess = null;
    }
  }
  const canSeeCorrectionsChip = canSeeOrderNotificationKind(
    "corrections",
    session?.role,
    moduleAccess,
  );
  const canSeeProstheticsChip = canSeeOrderNotificationKind(
    "prosthetics",
    session?.role,
    moduleAccess,
  );
  const canSeeAdminChip = canSeeOrderNotificationKind(
    "admin",
    session?.role,
    moduleAccess,
  );

  let prostheticsInTransitCount = 0;
  let prostheticsToOrderCount = 0;
  let labTasksPendingCount = 0;
  let labPickupsPendingCount = 0;
  try {
    if (canSeeProstheticsChip) {
      const [transit, toOrder] = await Promise.all([
        loadProstheticsInTransitForTenant(tenantId),
        loadProstheticsToOrderForTenant(tenantId),
      ]);
      prostheticsInTransitCount = transit.count;
      prostheticsToOrderCount = toOrder.count;
    }
  } catch (e) {
    console.error("[orders] prosthetics in-transit/to-order count", e);
  }
  try {
    if (tenantId) {
      const [tasksN, pickupsN] = await Promise.all([
        countPendingLabTasks(tenantId, "TASK"),
        countPendingLabTasks(tenantId, "PICKUP_FROM"),
      ]);
      labTasksPendingCount = tasksN;
      labPickupsPendingCount = pickupsN;
    }
  } catch (e) {
    console.error("[orders] lab tasks/pickups pending count", e);
  }

  let kaitenIntegrationActive = true;
  if (tenantId) {
    try {
      const prisma = await getPrisma();
      const integration = await loadKaitenIntegrationTenantState(
        prisma,
        tenantId,
      );
      kaitenIntegrationActive = integration.active;
    } catch {
      kaitenIntegrationActive = true;
    }
  }

  let userOrdersListPageSize: number | null = null;
  const [ordersPrisma, clientsPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
  ]);
  if (session?.sub) {
    try {
      const row = await clientsPrisma.user.findUnique({
        where: { id: session.sub },
        select: { ordersListPageSize: true },
      });
      userOrdersListPageSize = row?.ordersListPageSize ?? null;
    } catch {
      /* ignore */
    }
  }
  const pageSize = resolveOrdersPageSize(sp.limit, userOrdersListPageSize);
  const rawTag = sp.tag?.trim() ? sp.tag.trim() : null;
  const activeFilter = rawTag ? parseListTagParam(rawTag) : null;
  const onlyShippedActive =
    sp.onlyShipped === "1" || sp.onlyShipped === "true";
  const hideShippedRaw =
    sp.hideShipped === "1" || sp.hideShipped === "true";
  const hideShippedActive = hideShippedRaw && !onlyShippedActive;
  const listSearchQ = normalizeOrdersSearchQuery(sp.q);
  const fromUrl = sp.from?.trim() || null;
  const toUrl = sp.to?.trim() || null;
  const shipParsed = parseOrdersShipmentParams({
    ship: sp.ship,
    shipFrom: sp.shipFrom,
    shipTo: sp.shipTo,
  });
  const shipmentModeActive =
    shipParsed.mode != null && shipParsed.periodError == null;
  const shipFromUrl = sp.shipFrom?.trim() || null;
  const shipToUrl = sp.shipTo?.trim() || null;
  const shipmentModeLabel = ordersShipmentModeLabel(shipParsed);
  const periodParsed = ordersListCreatedAtPeriod(fromUrl, toUrl);
  const periodError =
    periodParsed.mode === "error" ? periodParsed.message : null;
  const dueDateRange =
    !shipmentModeActive && periodParsed.mode === "range"
      ? {
          start: periodParsed.start,
          endExclusive: periodParsed.endExclusive,
        }
      : null;
  const periodLabelActive =
    !shipmentModeActive && periodParsed.mode === "range"
      ? `${periodParsed.fromYmd} — ${periodParsed.toYmd}`
      : null;
  const listHrefCommon = {
    tag: rawTag ?? undefined,
    hideShipped: hideShippedActive,
    onlyShipped: onlyShippedActive,
    q: listSearchQ || undefined,
    from: shipmentModeActive ? undefined : (fromUrl ?? undefined),
    to: shipmentModeActive ? undefined : (toUrl ?? undefined),
    ship: shipmentModeActive ? shipParsed.mode ?? undefined : undefined,
    shipFrom: shipmentModeActive ? shipFromUrl ?? undefined : undefined,
    shipTo: shipmentModeActive ? shipToUrl ?? undefined : undefined,
  };
  const baseCountParts: Prisma.OrderWhereInput[] = [
    { tenantId: tenantId ?? "__missing_tenant__" },
    { archivedAt: null },
    orderTestVisibilityWhere({
      viewerRole: session?.role ?? null,
      viewerUserId: session?.sub ?? null,
    }),
  ];
  if (onlyShippedActive) {
    baseCountParts.push({ adminShippedOtpr: true });
  } else if (hideShippedActive) {
    baseCountParts.push({ adminShippedOtpr: false });
  }
  if (listSearchQ) {
    baseCountParts.push(await ordersSearchWhere(listSearchQ, tenantId));
  }
  if (dueDateRange) {
    baseCountParts.push({
      dueDate: {
        gte: dueDateRange.start,
        lt: dueDateRange.endExclusive,
      },
    });
  }
  const baseCountWhere =
    baseCountParts.length === 1 ? baseCountParts[0] : { AND: baseCountParts };
  const statusChipCountParts = baseCountParts.filter(
    (part) => !("dueDate" in part) && !("createdAt" in part),
  );
  const statusChipCountWhere =
    statusChipCountParts.length === 1
      ? statusChipCountParts[0]
      : { AND: statusChipCountParts };
  /** Счётчики чипов — кандидаты из pending-строк (без findMany всех id тенанта). */
  const attentionCount = tenantId
    ? await (async () => {
        const inbox = (ordersPrisma as {
          orderChatInboxItem: {
            findMany: (args: unknown) => Promise<Array<{ orderId: string }>>;
          };
        }).orderChatInboxItem;
        const [legacyCorrPending, inboxCorrPending] = await Promise.all([
          ordersPrisma.orderChatCorrection.findMany({
            where: {
              resolvedAt: null,
              rejectedAt: null,
              order: statusChipCountWhere,
            },
            select: { orderId: true },
            distinct: ["orderId"],
          }),
          inbox.findMany({
            where: {
              type: "CORRECTION",
              resolvedAt: null,
              rejectedAt: null,
              order: statusChipCountWhere,
            },
            select: { orderId: true },
            distinct: ["orderId"],
          }),
        ]);
        const corrCandidateIds = [
          ...new Set([
            ...legacyCorrPending.map((r) => r.orderId),
            ...inboxCorrPending.map((r) => r.orderId),
          ]),
        ];
        const pendingCorrections = await orderIdsWithPendingMergedCorrections(
          ordersPrisma,
          corrCandidateIds,
        );
        return pendingCorrections.size;
      })()
    : 0;
  /** Тот же источник, что «Заказать» в шапке и GET /to-order. */
  const prostheticsPendingCount = prostheticsToOrderCount;

  let labMentionCount = 0;
  if (tenantId) {
    labMentionCount = await countOrdersWithPendingKaitenLabMentionForUser(
      ordersPrisma,
      statusChipCountWhere,
      session?.sub,
    );
  }

  let kaitenColumnAlternates: string[] = [];
  let urgentCoefficientsInDb: number[] = [];
  if (tenantId && activeFilter?.kind === "kaitenColumn") {
    const rows = await ordersPrisma.order.groupBy({
      by: ["kaitenColumnTitle"],
      where: {
        tenantId,
        archivedAt: null,
        AND: [
          { kaitenColumnTitle: { not: null } },
          { kaitenColumnTitle: { not: activeFilter.title } },
        ],
      },
      orderBy: { kaitenColumnTitle: "asc" },
      take: 28,
    });
    kaitenColumnAlternates = rows
      .map((r) => r.kaitenColumnTitle)
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim());
  }
  if (tenantId && activeFilter?.kind === "urgent") {
    const rows = await ordersPrisma.order.groupBy({
      by: ["urgentCoefficient"],
      where: {
        tenantId,
        archivedAt: null,
        isUrgent: true,
        urgentCoefficient: { not: null },
      },
      orderBy: { urgentCoefficient: "asc" },
      take: 30,
    });
    urgentCoefficientsInDb = rows
      .map((r) => r.urgentCoefficient)
      .filter((c): c is number => typeof c === "number" && Number.isFinite(c));
  }

  let orders: Awaited<
    ReturnType<typeof fetchOrdersListPage>
  >["orders"];
  let nextCursor: string | null = null;
  let shipmentListTruncated = false;
  let labDueHmSlots: string[] = [];
  try {
    if (!tenantId) {
      throw new Error("tenant_context_required");
    }
    if (shipmentModeActive && shipParsed.mode) {
      const [page, slots] = await Promise.all([
        fetchOrdersShipmentListPage(ordersPrisma, {
          tenantId,
          cursor: sp.cursor,
          pageSize,
          shipmentMode: shipParsed.mode,
          shipFrom: shipParsed.shipFrom,
          shipTo: shipParsed.shipTo,
          tag: activeFilter ? rawTag : undefined,
          search: listSearchQ || undefined,
          ordersListForUserId: session?.sub ?? null,
          viewerRole: session?.role ?? null,
          viewerUserId: session?.sub ?? null,
        }),
        getLabDueHmSlotsForTenant(tenantId),
      ]);
      orders = page.orders;
      nextCursor = page.nextCursor;
      shipmentListTruncated = page.truncated;
      labDueHmSlots = slots;
    } else {
      const [page, slots] = await Promise.all([
        fetchOrdersListPage(ordersPrisma, {
          tenantId,
          cursor: sp.cursor,
          pageSize,
          tag: activeFilter ? rawTag : undefined,
          hideShipped: hideShippedActive,
          onlyShipped: onlyShippedActive,
          search: listSearchQ || undefined,
          dueDateRange: dueDateRange ?? undefined,
          ordersListForUserId: session?.sub ?? null,
          viewerRole: session?.role ?? null,
          viewerUserId: session?.sub ?? null,
        }),
        getLabDueHmSlotsForTenant(tenantId),
      ]);
      orders = page.orders;
      nextCursor = page.nextCursor;
      labDueHmSlots = slots;
    }
  } catch (e) {
    console.error("[orders page] prisma", e);
    const msg = e instanceof Error ? e.message : String(e);
    const tenantMissing = msg === "tenant_context_required";
    return (
      <ModuleFrame
        title="Заказы"
        rootClassName={ORDERS_FRAME_ROOT}
        titleBesideEnd={<OrdersPageTitleExtras />}
      >
        <div className={ORDERS_MAIN_LAYOUT}>
          {tenantMissing ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 sm:px-5 sm:py-5 sm:text-base">
              <p className="text-base font-medium sm:text-lg">
                Не удалось открыть список заказов
              </p>
              <p className="mt-2 text-amber-900/90">
                Не задана организация (тенант) для сессии. Войдите в аккаунт
                снова или обратитесь к администратору, если сотруднику не
                назначена лаборатория.
              </p>
            </div>
          ) : (
            <PrismaDataLoadErrorCallout
              title="Не удалось открыть список заказов"
              intro="Чаще всего схема БД и сгенерированный клиент Prisma не совпали после обновления."
              error={e}
            />
          )}
        </div>
      </ModuleFrame>
    );
  }

  const alwaysShowOrderAttentionChips = session?.role === "FINANCIAL_MANAGER";
  const showCorrectionsChip =
    canSeeCorrectionsChip &&
    (alwaysShowOrderAttentionChips || attentionCount > 0);
  const showProstheticsChip =
    canSeeProstheticsChip &&
    (alwaysShowOrderAttentionChips || prostheticsPendingCount > 0);
  const showAdminChip =
    canSeeAdminChip &&
    (alwaysShowOrderAttentionChips ||
      labMentionCount > 0 ||
      activeFilter?.kind === "kaitenLabMention");
  const showOrdersQuickFilterChipsRow =
    showCorrectionsChip ||
    showProstheticsChip ||
    showAdminChip ||
    activeFilter != null;

  return (
    <ModuleFrame
      title="Заказы"
      rootClassName={ORDERS_FRAME_ROOT}
      titleBesideEnd={<OrdersPageTitleExtras />}
    >
      <div className={`${ORDERS_MAIN_LAYOUT} space-y-4`}>
      <OrdersListKaitenChatShell
        orderIds={orders
          .filter((o) => o.kaitenCardId != null)
          .map((o) => o.id)}
        pollingEnabled={!isDemo && kaitenIntegrationActive}
        searchActive={Boolean(listSearchQ)}
      >
      <div className={`${ORDERS_LIST_STACK} space-y-4`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1">
          <OrderPostingMonthBar
            toolbarEnd={
              <OrdersListShippedToolbar
                pageSize={pageSize}
                rawTag={rawTag}
                listSearchQ={listSearchQ}
                fromUrl={fromUrl}
                toUrl={toUrl}
                onlyShippedActive={onlyShippedActive}
                hideShippedActive={hideShippedActive}
              />
            }
          />
        </div>
        <OrdersListHeaderActionCards
          initialInTransitCount={prostheticsInTransitCount}
          initialToOrderCount={prostheticsPendingCount}
          initialCorrectionsPendingCount={attentionCount}
          initialTasksPendingCount={labTasksPendingCount}
          initialPickupsPendingCount={labPickupsPendingCount}
          canMarkArrived={canMarkProstheticsArrived}
          canResolveTasks={canMarkProstheticsArrived}
          canAcceptCorrections={canMarkProstheticsArrived}
          showProstheticsBlock={canSeeProstheticsChip}
        />
      </div>
      <div className="no-print space-y-4">
        {periodError ? (
          <div className="w-full rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            {periodError} Фильтр по дате не применён.
          </div>
        ) : null}
        {periodLabelActive ? (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-sm dark:border-sky-900/50 dark:bg-sky-950/25 sm:px-4 sm:py-2.5 sm:text-base">
            <span className="text-[var(--text-body)]">
              Период (лабораторный срок, МСК):{" "}
              <strong className="font-mono text-[var(--text-strong)]">
                {periodLabelActive}
              </strong>
            </span>
            <Link
              href={ordersListHref({
                limit: pageSize,
                ...listHrefCommon,
                from: undefined,
                to: undefined,
              })}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--sidebar-blue)] shadow-sm hover:bg-[var(--table-row-hover)]"
            >
              Сбросить период
            </Link>
          </div>
        ) : null}
        {shipmentModeActive && shipmentModeLabel ? (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/25 sm:px-4 sm:py-2.5 sm:text-base">
            <span className="text-[var(--text-body)]">
              Запись:{" "}
              <strong className="font-mono text-[var(--text-strong)]">
                {shipmentModeLabel}
              </strong>
              {" "}· только неотгруженные · сортировка по дате записи (старые сверху)
            </span>
            <Link
              href={ordersListHref({
                limit: pageSize,
                tag: rawTag ?? undefined,
                hideShipped: hideShippedActive,
                onlyShipped: onlyShippedActive,
                q: listSearchQ || undefined,
              })}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--sidebar-blue)] shadow-sm hover:bg-[var(--table-row-hover)]"
            >
              Сбросить запись
            </Link>
          </div>
        ) : null}
        {shipmentModeActive ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Режим записи: фильтр по лабораторному сроку (слева) не действует.
          </p>
        ) : null}
        {shipParsed.periodError ? (
          <div className="w-full rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            {shipParsed.periodError} Режим записи не применён.
          </div>
        ) : null}
        {shipmentListTruncated ? (
          <div className="w-full rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            Показаны первые 5000 неотгруженных нарядов по фильтру — уточните период или поиск.
          </div>
        ) : null}
        <Suspense
          fallback={
            <div className="text-sm text-[var(--text-muted)]">Поиск…</div>
          }
        >
          <div className="hidden md:block">
            <OrdersListFiltersRow
              pageSize={pageSize}
              appliedFrom={fromUrl}
              appliedTo={toUrl}
              initialSearchQ={listSearchQ}
              tag={rawTag ?? undefined}
              hideShipped={hideShippedActive}
              onlyShipped={onlyShippedActive}
              appliedShipFrom={shipFromUrl}
              appliedShipTo={shipToUrl}
              shipMode={shipmentModeActive ? shipParsed.mode : null}
              idSuffix="desktop"
            />
          </div>
          <div className="md:hidden">
            <OrdersListFiltersRow
              pageSize={pageSize}
              appliedFrom={fromUrl}
              appliedTo={toUrl}
              initialSearchQ={listSearchQ}
              tag={rawTag ?? undefined}
              hideShipped={hideShippedActive}
              onlyShipped={onlyShippedActive}
              showSearch={false}
              appliedShipFrom={shipFromUrl}
              appliedShipTo={shipToUrl}
              shipMode={shipmentModeActive ? shipParsed.mode : null}
              idSuffix="mobile"
            />
          </div>
        </Suspense>
        {showOrdersQuickFilterChipsRow ? (
          <div className="flex min-h-[3.25rem] w-full items-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="flex flex-wrap items-center gap-2">
          {showCorrectionsChip ? (
            <Link
              href={ordersListHref({
                limit: pageSize,
                ...listHrefCommon,
                tag: LIST_TAG_ORDER_ATTENTION,
              })}
              className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
                activeFilter?.kind === "orderAttention"
                  ? "border-amber-400/90 bg-amber-100 text-amber-950 ring-2 ring-amber-500/85 dark:border-amber-700 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-500/70"
                  : "border-amber-300/70 bg-amber-100/70 text-amber-950 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100 dark:hover:bg-amber-950/50"
              }`}
              title="Наряды с непринятыми корректировками из чата («!!!»); в списке также может попасть расхождение суммы счёта с составом"
            >
              <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
                Корректировки
              </span>
              <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
                {attentionCount}
              </span>
            </Link>
          ) : null}
          {showProstheticsChip ? (
            <Link
              href={ordersListHref({
                limit: pageSize,
                ...listHrefCommon,
                tag: LIST_TAG_PROSTHETICS_PENDING,
              })}
              className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
                activeFilter?.kind === "prostheticsPending"
                  ? "border-sky-400/90 bg-sky-100 text-sky-950 ring-2 ring-sky-500/85 dark:border-sky-700 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-500/70"
                  : "border-sky-300/70 bg-sky-100/70 text-sky-950 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/35 dark:text-sky-100 dark:hover:bg-sky-950/50"
              }`}
              title="Быстрый фильтр по тегу «Заказ протетики»"
            >
              <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
                Заказ протетики
              </span>
              <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
                {prostheticsPendingCount}
              </span>
            </Link>
          ) : null}
          {showAdminChip ? (
            <Link
              href={ordersListHref({
                limit: pageSize,
                ...listHrefCommon,
                tag: LIST_TAG_KAITEN_LAB_MENTION,
              })}
              className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
                activeFilter?.kind === "kaitenLabMention"
                  ? "border-violet-400/90 bg-violet-100 text-violet-950 ring-2 ring-violet-500/90 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-100 dark:ring-violet-500/75"
                  : "border-violet-300/70 bg-violet-100/70 text-violet-950 hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-950/35 dark:text-violet-100 dark:hover:bg-violet-950/50"
              }`}
              title="Наряды с непрочитанным упоминанием лаборатории в чате Kaiten (@…)"
            >
              <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
                Упоминания
              </span>
              <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
                {labMentionCount}
              </span>
            </Link>
          ) : null}
          {activeFilter ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-md border border-sky-200/80 bg-sky-50/80 px-2 py-1 text-sm dark:border-sky-900/50 dark:bg-sky-950/25">
              <span className="min-w-0 truncate whitespace-nowrap text-[var(--text-body)]">
                Фильтр по тегу:{" "}
                <strong className="text-[var(--text-strong)]">
                  {humanListTagLabel(activeFilter)}
                </strong>
              </span>
              <Link
                href={ordersListHref({
                  limit: pageSize,
                  ...listHrefCommon,
                  tag: undefined,
                })}
                className="shrink-0 whitespace-nowrap rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-medium text-[var(--sidebar-blue)] shadow-sm hover:bg-[var(--table-row-hover)]"
              >
                Показать все заказы
              </Link>
            </span>
          ) : null}
          {activeFilter
            ? relatedOrdersListTagQuickFilters(activeFilter, {
                kaitenColumnAlternates,
                urgentCoefficientsInDb,
              }).map((opt) => {
                const optParsed = parseListTagParam(opt.tag);
                const isActive = Boolean(
                  optParsed && listTagParamsEqual(activeFilter, optParsed),
                );
                return (
                  <Link
                    key={opt.tag}
                    href={ordersListHref({
                      limit: pageSize,
                      ...listHrefCommon,
                      tag: opt.tag,
                    })}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm ${
                      isActive
                        ? "border-sky-500 bg-sky-100 text-sky-950 ring-1 ring-sky-500/50 dark:border-sky-600 dark:bg-sky-900/50 dark:text-sky-50"
                        : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)]"
                    }`}
                  >
                    {opt.label}
                  </Link>
                );
              })
            : null}
        </div>
      </div>
        ) : null}
        {rawTag && !activeFilter ? (
          <div className="w-full rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            Параметр <code className="font-mono">tag</code> в ссылке не распознан — показан полный список.
          </div>
        ) : null}
        {hideShippedActive && !activeFilter ? (
          <div className="w-full rounded-lg border border-emerald-300/70 bg-emerald-100/60 px-4 py-2.5 text-sm text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100">
            В списке скрыты наряды с отметкой «Работа отправлена» (отгруженные).
          </div>
        ) : null}
        {onlyShippedActive && !activeFilter ? (
          <div className="w-full rounded-lg border border-sky-300/70 bg-sky-100/60 px-4 py-2.5 text-sm text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-100">
            В списке только наряды с отметкой «Работа отправлена» (отгруженные).
          </div>
        ) : null}
      </div>
      <OrdersListStickySearch
        initialSearchQ={listSearchQ}
        pageSize={pageSize}
        tag={rawTag ?? undefined}
        hideShipped={hideShippedActive}
        onlyShipped={onlyShippedActive}
      />
      <OrdersListChrome
        className="w-full max-w-full min-w-0 self-start"
        toolbar={
          <div className="orders-list-mirror-thead hidden w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-t-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] shadow-[0_1px_0_var(--card-border),0_10px_18px_rgba(0,0,0,0.10)] [-webkit-overflow-scrolling:touch] md:block print:hidden">
            <table className={ORDERS_TABLE_CLASS} aria-hidden="true">
              <OrdersTableColGroup />
              <thead>
                <OrdersTableHeaderRow isDemo={isDemo} />
              </thead>
            </table>
          </div>
        }
      >
      <div className="orders-harmony-table-shell w-full min-w-0 overflow-x-auto overflow-y-visible xl:overflow-x-visible [-webkit-overflow-scrolling:touch] rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] print:max-w-none print:w-full">
        <table className={ORDERS_TABLE_CLASS}>
          <OrdersTableColGroup />
          <thead className="sr-only">
            <OrdersTableHeaderRow isDemo={isDemo} />
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="px-4 py-10 text-center text-sm text-[var(--text-muted)]"
                >
                  {activeFilter
                    ? "Нет заказов с выбранным тегом на этой странице."
                    : listSearchQ
                      ? "Ничего не найдено по этому запросу. Измените текст поиска или сбросьте фильтр."
                      : shipmentModeActive
                        ? "Нет неотгруженных нарядов в выбранном режиме записи на этой странице."
                        : periodLabelActive
                        ? "Нет нарядов с лабораторным сроком в выбранном периоде (МСК) на этой странице. Измените диапазон, сбросьте период или перейдите к следующей странице."
                        : onlyShippedActive
                          ? "Нет отгруженных нарядов на этой странице. Снимите фильтр «только отгруженные» или перейдите к следующей странице."
                          : hideShippedActive
                            ? "Нет нарядов без отметки «Работа отправлена» на этой странице. Снимите «Скрыть отгруженные» или перейдите к следующей странице."
                            : "Пока нет заказов. Сохраните наряд из формы «Новый заказ»."}
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const kaitenWebUrl =
                  o.kaitenCardId != null
                    ? getKaitenCardWebUrl(o.kaitenCardId)
                    : null;
                const kanbanWebUrl = siteOrigin
                  ? `${siteOrigin.replace(/\/$/, "")}${kanbanOrderDeepLinkPath(o.id)}`
                  : null;
                const kaitenUrl = kaitenWebUrl ?? kanbanWebUrl;
                const workSent = o.adminShippedOtpr;
                const admission = formatAdmission(o);
                const blocked = o.kaitenBlocked === true;
                const labDateFormatted = formatOrderCardDate(o.dueDate);
                const appointmentDateFormatted = formatOrderCardDate(
                  o.appointmentDate ?? o.dueToAdminsAt,
                );
                const isLabOverdue =
                  o.dueDate != null &&
                  o.dueDate.getTime() < Date.now() &&
                  !workSent;
                const kaitenColTrimmed = o.kaitenColumnTitle?.trim() ?? "";
                const kaitenStatusFilterHref = blocked
                  ? ordersListHref({
                      limit: pageSize,
                      ...listHrefCommon,
                      tag: LIST_TAG_KAITEN_BLOCKED,
                    })
                  : kaitenColTrimmed
                    ? ordersListHref({
                        limit: pageSize,
                        ...listHrefCommon,
                        tag: listTagKaitenColumnTitle(kaitenColTrimmed),
                      })
                    : null;
                const rowAccent = resolveOrderListRowAccentKind({
                  listPendingChatCorrections: o.listPendingChatCorrections,
                  listCompositionMismatch: o.listCompositionMismatch,
                  listPendingProstheticsRequests:
                    o.listPendingProstheticsRequests,
                  prostheticsOrdered: o.prostheticsOrdered,
                });
                const rowClass = blocked
                  ? "border-b-2 border-red-800/45 bg-gradient-to-r from-red-950/40 via-red-950/25 to-red-900/15 text-[var(--app-text)] dark:border-red-900/60 dark:from-red-950/50 dark:via-red-950/35 dark:to-red-950/20 [&>td:not(:first-child):not(:last-child)]:text-red-950/95 dark:[&>td:not(:first-child):not(:last-child)]:text-red-50/90"
                  : mergeOrderListRowClass({
                      shipped: workSent,
                      accent: rowAccent,
                      shippedClass: ORDER_SHIPPED_ROW_CLASS,
                    });
                const harmonyRowState = resolveOrderListHarmonyRowState({
                  blocked,
                  shipped: workSent,
                  accent: rowAccent,
                });
                const renderTagsNode = (opts?: { omitKaitenColumnTag?: boolean }) => (
                  <OrderListTagsCell
                    orderId={o.id}
                    pageSize={pageSize}
                    orderAttentionWarning={
                      o.listCompositionMismatch ||
                      o.listPendingChatCorrections
                    }
                    listPendingChatCorrections={o.listPendingChatCorrections}
                    listCompositionMismatch={o.listCompositionMismatch}
                    hideShipped={hideShippedActive}
                    onlyShipped={onlyShippedActive}
                    kaitenCardId={o.kaitenCardId}
                    demoKanbanColumn={o.demoKanbanColumn}
                    demoCardTypeName={o.kaitenCardType?.name ?? null}
                    kaitenColumnTitle={o.kaitenColumnTitle}
                    prostheticsOrdered={o.prostheticsOrdered}
                    listPendingProstheticsRequests={
                      o.listPendingProstheticsRequests
                    }
                    invoicePrinted={o.invoicePrinted}
                    hasInvoiceAttachment={o.invoiceAttachmentId != null}
                    invoiceAttachmentId={o.invoiceAttachmentId}
                    invoicePaperDocs={o.invoicePaperDocs}
                    invoiceSentToEdo={o.invoiceSentToEdo}
                    invoiceEdoSigned={o.invoiceEdoSigned}
                    payment={o.payment}
                    paymentPartialRub={o.paymentPartialRub}
                    adminShippedOtpr={o.adminShippedOtpr}
                    kaitenBlocked={o.kaitenBlocked === true}
                    kaitenBlockReason={o.kaitenBlockReason}
                    isUrgent={o.isUrgent}
                    urgentCoefficient={o.urgentCoefficient}
                    customTags={o.listCustomTags}
                    listSearchQ={listSearchQ || undefined}
                    periodFrom={fromUrl}
                    periodTo={toUrl}
                    omitKaitenColumnTag={opts?.omitKaitenColumnTag}
                  />
                );
                const tagsNode = renderTagsNode({ omitKaitenColumnTag: true });
                return (
                <OrdersListTableRow
                  key={o.id}
                  orderId={o.id}
                  orderNumber={o.orderNumber}
                  className={rowClass}
                  harmonyRowState={harmonyRowState}
                  rowAccent={blocked ? null : rowAccent}
                  clinicName={o.clinic?.name ?? "Частное лицо"}
                  clinicAddress={o.clinic?.address?.trim() || undefined}
                  doctorName={personNameSurnameInitials(o.doctor.fullName)}
                  patientName={
                    o.patientName
                      ? personNameSurnameInitials(o.patientName)
                      : undefined
                  }
                  labDate={labDateFormatted}
                  appointmentDate={appointmentDateFormatted}
                  kaitenColumnTitle={o.kaitenColumnTitle}
                  demoKanbanColumn={o.demoKanbanColumn}
                  demoCardTypeName={o.kaitenCardType?.name ?? null}
                  kaitenCardId={o.kaitenCardId}
                  kaitenBlocked={blocked}
                  kaitenBlockReason={o.kaitenBlockReason}
                  kaitenFilterHref={kaitenStatusFilterHref}
                  isLabOverdue={isLabOverdue}
                  tagsNode={tagsNode}
                  mobileShippedNode={
                    <OrderShippedToggle orderId={o.id} shipped={workSent} />
                  }
                  mobileDatesNode={
                    <div className="flex w-full max-w-[9.5rem] flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="w-7 shrink-0 text-[9px] font-semibold uppercase text-[var(--text-muted)]">
                          Лаб
                        </span>
                        <div className="min-w-0 flex-1 scale-90 origin-right">
                          <OrderListDueCell
                            orderId={o.id}
                            dueIso={o.dueDate?.toISOString() ?? null}
                            createdAtIso={o.createdAt.toISOString()}
                            labHmSlots={labDueHmSlots}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-7 shrink-0 text-[9px] font-semibold uppercase text-[var(--text-muted)]">
                          Зап
                        </span>
                        <div className="min-w-0 flex-1 scale-90 origin-right">
                          <OrderListDueCell
                            variant="appointment"
                            orderId={o.id}
                            dueIso={
                              o.appointmentDate?.toISOString() ??
                              o.dueToAdminsAt?.toISOString() ??
                              null
                            }
                            createdAtIso={o.createdAt.toISOString()}
                            appointmentHasTime={o.dueToAdminsHasTime !== false}
                          />
                        </div>
                      </div>
                    </div>
                  }
                  mobileActionsNode={
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]">
                        <OrderListOrderChatCell
                          orderId={o.id}
                          orderNumber={o.orderNumber}
                          patientName={
                            o.patientName
                              ? personNameSurnameInitials(o.patientName)
                              : undefined
                          }
                          doctorName={personNameSurnameInitials(o.doctor.fullName)}
                          labMentionHighlight={
                            canSeeAdminChip && o.listKaitenLabMentionHighlight
                          }
                          embedded
                        />
                      </div>
                      <div className="flex h-8 items-center gap-0.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-0.5">
                        {!workSent ? (
                          <OrderNarjadPrintTrigger
                            orderId={o.id}
                            variant="icon"
                            title="Печать наряда (PDF) — диалог печати"
                          />
                        ) : null}
                        <OrderStickerPrintLink orderId={o.id} />
                        {kaitenUrl ? (
                          <OrderKaitenQrModal
                            url={kaitenUrl}
                            kanbanUrl={
                              kaitenWebUrl && kanbanWebUrl ? kanbanWebUrl : null
                            }
                            compact
                            variant={
                              o.kaitenCardId != null && !isDemo
                                ? "kaiten"
                                : "kanban"
                            }
                          />
                        ) : o.kaitenCardId != null ? (
                          <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-xs text-amber-600 dark:text-amber-400"
                            title="Задайте KAITEN_WEB_ORIGIN или KAITEN_CARD_URL_TEMPLATE"
                          >
                            ⚠
                          </span>
                        ) : null}
                      </div>
                    </>
                  }
                >
                  <OrderListOrderChatCell
                    orderId={o.id}
                    orderNumber={o.orderNumber}
                    patientName={
                      o.patientName
                        ? personNameSurnameInitials(o.patientName)
                        : undefined
                    }
                    doctorName={personNameSurnameInitials(o.doctor.fullName)}
                    labMentionHighlight={
                      canSeeAdminChip && o.listKaitenLabMentionHighlight
                    }
                  />
                  <td className="max-md:hidden min-w-0 px-0.5 py-1 align-middle sm:px-0.5 sm:py-1.5">
                    <div className="flex min-w-0 flex-nowrap items-center justify-center gap-0">
                      {!workSent ? (
                        <OrderNarjadPrintTrigger
                          orderId={o.id}
                          variant="icon"
                          title="Печать наряда (PDF) — диалог печати"
                        />
                      ) : null}
                      <OrderStickerPrintLink orderId={o.id} />
                      {kaitenUrl ? (
                        <OrderKaitenQrModal
                          url={kaitenUrl}
                          kanbanUrl={
                            kaitenWebUrl && kanbanWebUrl ? kanbanWebUrl : null
                          }
                          compact
                          variant={o.kaitenCardId != null && !isDemo ? "kaiten" : "kanban"}
                        />
                      ) : o.kaitenCardId != null ? (
                        <span
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-xs text-amber-600 dark:text-amber-400 sm:h-6 sm:w-6 sm:text-sm"
                          title="Задайте KAITEN_WEB_ORIGIN или KAITEN_CARD_URL_TEMPLATE"
                        >
                          ⚠
                        </span>
                      ) : (
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[var(--text-muted)] sm:h-6 sm:w-6">
                          —
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="min-w-0 px-1 py-1 align-middle sm:px-1.5 sm:py-1.5">
                    <div className="flex min-h-[2.5rem] flex-col items-center justify-center gap-0.5 -translate-y-px">
                      <Link
                        href={orderPathById(o.id)}
                        className="whitespace-nowrap font-mono text-[11px] font-semibold leading-none text-[var(--sidebar-blue)] hover:underline sm:text-xs"
                        title={`${o.orderNumber} — открыть наряд`}
                      >
                        {o.orderNumber}
                      </Link>
                      <OrderListKaitenColumnTag
                        kaitenCardId={o.kaitenCardId}
                        demoKanbanColumn={o.demoKanbanColumn}
                        demoCardTypeName={o.kaitenCardType?.name ?? null}
                        kaitenColumnTitle={o.kaitenColumnTitle}
                        kaitenBlocked={blocked}
                        kaitenBlockReason={o.kaitenBlockReason}
                        filterHref={kaitenStatusFilterHref}
                        placement="underOrderNumber"
                      />
                    </div>
                  </td>
                  <td className="min-w-0 px-1 py-1 align-middle text-center text-[var(--text-strong)] sm:px-1.5 sm:py-1.5">
                    {o.clinic ? (
                      <Link
                        href={`/clients/${o.clinic.id}`}
                        title={o.clinic.name}
                        className="block hyphens-auto break-words text-center text-[var(--sidebar-blue)] hover:underline"
                      >
                        {o.clinic.name}
                      </Link>
                    ) : (
                      <span className="block break-words text-center text-[var(--text-secondary)]">
                        Частное лицо
                      </span>
                    )}
                  </td>
                  <td className="min-w-0 px-1 py-1 align-middle text-center text-[var(--text-body)] sm:px-1.5 sm:py-1.5">
                    {o.clinic?.address?.trim() ? (
                      <span
                        className="block hyphens-auto break-words text-center text-[var(--text-secondary)]"
                        title={o.clinic.address.trim()}
                      >
                        {o.clinic.address.trim()}
                      </span>
                    ) : (
                      <span className="block text-center text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="min-w-0 px-1 py-1 align-middle text-center text-[var(--text-strong)] sm:px-1.5 sm:py-1.5">
                    <Link
                      href={`/clients/doctors/${o.doctor.id}`}
                      title={o.doctor.fullName}
                      className="block break-words text-center text-[var(--sidebar-blue)] hover:underline sm:leading-snug"
                    >
                      {personNameSurnameInitials(o.doctor.fullName)}
                    </Link>
                  </td>
                  <td
                    className="min-w-0 px-1 py-1 align-middle text-center text-[var(--text-body)] sm:px-1.5 sm:py-1.5"
                    title={o.patientName ?? undefined}
                  >
                    <span className="block hyphens-auto break-words text-center">
                      {o.patientName
                        ? personNameSurnameInitials(o.patientName)
                        : "—"}
                    </span>
                  </td>
                  <td
                    className="min-w-0 whitespace-nowrap px-1 py-1 align-middle text-center text-[11px] font-light text-[var(--text-muted)] sm:px-1.5 sm:py-1.5 sm:text-xs"
                    title={admission.full}
                  >
                    {admission.short}
                  </td>
                  <td className="min-w-0 w-[5.5rem] max-w-[5.5rem] px-0.5 py-1 align-middle text-[var(--text-secondary)] sm:px-1 sm:py-1.5">
                    <OrderListDueCell
                      orderId={o.id}
                      dueIso={o.dueDate?.toISOString() ?? null}
                      createdAtIso={o.createdAt.toISOString()}
                      labHmSlots={labDueHmSlots}
                    />
                  </td>
                  <td className="min-w-0 w-[5.5rem] max-w-[5.5rem] px-0.5 py-1 align-middle text-[var(--text-secondary)] sm:px-1 sm:py-1.5">
                    <OrderListDueCell
                      variant="appointment"
                      orderId={o.id}
                      dueIso={
                        o.appointmentDate?.toISOString() ??
                        o.dueToAdminsAt?.toISOString() ??
                        null
                      }
                      createdAtIso={o.createdAt.toISOString()}
                      appointmentHasTime={o.dueToAdminsHasTime !== false}
                    />
                  </td>
                  <td className="max-md:hidden min-w-0 px-0.5 py-1 align-middle sm:px-1 sm:py-1.5">
                    <OrderListAdminMemoCell
                      orderId={o.id}
                      initialMemo={o.listAdminMemo ?? null}
                    />
                  </td>
                  <td
                    data-shipped-cell
                    className="min-w-0 px-1 py-1 align-middle text-center sm:px-1.5 sm:py-1.5"
                  >
                    <OrderShippedToggle orderId={o.id} shipped={workSent} />
                  </td>
                </OrdersListTableRow>
              );
              })
            )}
          </tbody>
        </table>
      </div>
      {sp.cursor || nextCursor ? (
        <div className="no-print flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {sp.cursor ? (
              <Link
                href={ordersListHref({
                  limit: pageSize,
                  ...listHrefCommon,
                })}
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)] sm:text-base"
              >
                К началу списка
              </Link>
            ) : null}
            {nextCursor ? (
              <Link
                href={ordersListHref({
                  limit: pageSize,
                  cursor: nextCursor,
                  ...listHrefCommon,
                })}
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] sm:text-base"
              >
                Следующие {pageSize}
              </Link>
            ) : null}
          </div>
          {session?.sub && !isSingleUserPortable() ? (
            <div className="min-w-0 sm:ml-auto sm:max-w-[min(100%,28rem)]">
              <OrdersListPageSizePref
                paginationBar
                savedInProfile={userOrdersListPageSize}
                effectivePageSize={pageSize}
                tag={rawTag ?? undefined}
                hideShipped={hideShippedActive}
                onlyShipped={onlyShippedActive}
                q={listSearchQ || undefined}
                from={fromUrl ?? undefined}
                to={toUrl ?? undefined}
                ship={shipmentModeActive ? shipParsed.mode ?? undefined : undefined}
                shipFrom={shipFromUrl ?? undefined}
                shipTo={shipToUrl ?? undefined}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      </OrdersListChrome>
      </div>
      </OrdersListKaitenChatShell>
      </div>
    </ModuleFrame>
  );
}
