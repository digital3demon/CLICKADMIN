import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { OrderKaitenQrModal } from "@/components/orders/OrderKaitenQrModal";
import { OrderListDueCell } from "@/components/orders/OrderListDueCell";
import { OrderListTagsCell } from "@/components/orders/OrderListTagsCell";
import { OrderListOrderChatCell } from "@/components/orders/OrderListOrderChatCell";
import { OrdersListKaitenChatShell } from "@/components/orders/OrdersListKaitenChatShell";
import { OrderNarjadPrintTrigger } from "@/components/orders/OrderNarjadPrintTrigger";
import { OrderPostingMonthBar } from "@/components/orders/OrderPostingMonthBar";
import { OrdersListShippedToolbar } from "@/components/orders/OrdersListShippedToolbar";
import { OrdersListPageSizePref } from "@/components/orders/OrdersListPageSizePref";
import { OrdersListPeriodForm } from "@/components/orders/OrdersListPeriodForm";
import { OrdersListSearch } from "@/components/orders/OrdersListSearch";
import { OrdersListTableRow } from "@/components/orders/OrdersListTableRow";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { getSiteOrigin } from "@/lib/site-origin-server";
import { fetchOrdersListPage } from "@/lib/fetch-orders-list-page";
import { countOrdersWithPendingKaitenLabMentionForUser } from "@/lib/order-kaiten-lab-mention-count";
import {
  humanListTagLabel,
  LIST_TAG_KAITEN_LAB_MENTION,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PROSTHETICS_PENDING,
  parseListTagParam,
  relatedOrdersListTagQuickFilters,
  listTagParamsEqual,
} from "@/lib/order-list-tag-filter";
import { resolveOrdersPageSize } from "@/lib/orders-list-cursor";
import { ordersListCreatedAtPeriod } from "@/lib/orders-list-period";
import {
  normalizeOrdersSearchQuery,
  ordersListHref,
} from "@/lib/orders-list-query";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { PrismaDataLoadErrorCallout } from "@/components/layout/PrismaDataLoadErrorCallout";
import { ordersSearchWhere } from "@/lib/fetch-orders-list-page";
import { getLabDueHmSlotsForTenant } from "@/lib/get-lab-due-hm-slots-for-tenant";
import { orderTestVisibilityWhere } from "@/lib/order-test-visibility";
import { orderPathById } from "@/lib/order-public-ref";
export const dynamic = "force-dynamic";

/** Контент списка на всю ширину рабочей области (таблица сама делит колонки). */
const ORDERS_MAIN_LAYOUT = "w-full min-w-0 max-w-full";

/** Вся ширина main: иначе при узком окне таблица с `w-max` не получает горизонтальный скролл. */
const ORDERS_LIST_STACK = "w-full min-w-0 space-y-4";

/** Меньше внешних полей, чем у стандартного ModuleFrame — ближе к сайдбару. */
const ORDERS_FRAME_ROOT =
  "!px-2 !pb-6 !pt-4 sm:!px-3 sm:!pb-7 sm:!pt-5 md:!px-4 md:!pb-8 md:!pt-6 lg:!px-4 lg:!pb-9 lg:!pt-7";

/** Поступление: дата прихода работы; без явной даты — как в наряде: дата занесения в CRM. */
function formatAdmission(o: {
  workReceivedAt: Date | null;
  createdAt: Date;
}): string {
  const d = o.workReceivedAt ?? o.createdAt;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  }>;
}) {
  const sp = await searchParams;
  const session = await getSessionFromCookies();
  const isDemo = Boolean(session?.demo);
  const siteOrigin = await getSiteOrigin();
  const tenantId = session
    ? await getTenantIdForSession(session)
    : null;

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
  const periodParsed = ordersListCreatedAtPeriod(fromUrl, toUrl);
  const periodError =
    periodParsed.mode === "error" ? periodParsed.message : null;
  const createdAtRange =
    periodParsed.mode === "range"
      ? {
          start: periodParsed.start,
          endExclusive: periodParsed.endExclusive,
        }
      : null;
  const periodLabelActive =
    periodParsed.mode === "range"
      ? `${periodParsed.fromYmd} — ${periodParsed.toYmd}`
      : null;
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
  if (createdAtRange) {
    baseCountParts.push({
      createdAt: {
        gte: createdAtRange.start,
        lt: createdAtRange.endExclusive,
      },
    });
  }
  const baseCountWhere =
    baseCountParts.length === 1 ? baseCountParts[0] : { AND: baseCountParts };
  /** Непринятые корректировки «!!!» (как колонка списка и формулировка счётчика). */
  const pendingCorrectionsWhere = {
    chatCorrections: {
      some: { resolvedAt: null, rejectedAt: null },
    },
  } satisfies Prisma.OrderWhereInput;
  /** Открытые заявки «???» по протетике без отметки «Протетика заказана». */
  const pendingProstheticsWhere = {
    prostheticsOrdered: false,
    prostheticsRequests: {
      some: { resolvedAt: null, rejectedAt: null },
    },
  } satisfies Prisma.OrderWhereInput;
  const [attentionCount, prostheticsPendingCount] = tenantId
    ? await Promise.all([
        ordersPrisma.order.count({
          where: {
            AND: [baseCountWhere, pendingCorrectionsWhere],
          },
        }),
        ordersPrisma.order.count({
          where: {
            AND: [baseCountWhere, pendingProstheticsWhere],
          },
        }),
      ])
    : [0, 0];

  let labMentionCount = 0;
  if (tenantId) {
    labMentionCount = await countOrdersWithPendingKaitenLabMentionForUser(
      ordersPrisma,
      baseCountWhere,
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
  let labDueHmSlots: string[] = [];
  try {
    if (!tenantId) {
      throw new Error("tenant_context_required");
    }
    const [page, slots] = await Promise.all([
      fetchOrdersListPage(ordersPrisma, {
        tenantId,
        cursor: sp.cursor,
        pageSize,
        tag: activeFilter ? rawTag : undefined,
        hideShipped: hideShippedActive,
        onlyShipped: onlyShippedActive,
        search: listSearchQ || undefined,
        createdAtRange: createdAtRange ?? undefined,
        ordersListForUserId: session?.sub ?? null,
        viewerRole: session?.role ?? null,
        viewerUserId: session?.sub ?? null,
      }),
      getLabDueHmSlotsForTenant(tenantId),
    ]);
    orders = page.orders;
    nextCursor = page.nextCursor;
    labDueHmSlots = slots;
  } catch (e) {
    console.error("[orders page] prisma", e);
    const msg = e instanceof Error ? e.message : String(e);
    const tenantMissing = msg === "tenant_context_required";
    return (
      <ModuleFrame
        title="Заказы"
        rootClassName={ORDERS_FRAME_ROOT}
        titleBesideEnd={
          <Link
            href="/orders/archived"
            className="text-[0.7rem] font-light tracking-wide text-[var(--text-muted)] hover:text-[var(--app-text)] hover:underline sm:text-xs"
          >
            Архив
          </Link>
        }
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

  const showOrdersQuickFilterChipsRow =
    attentionCount > 0 || prostheticsPendingCount > 0 || labMentionCount > 0;

  return (
    <ModuleFrame
      title="Заказы"
      rootClassName={ORDERS_FRAME_ROOT}
      titleBesideEnd={
        <Link
          href="/orders/archived"
          className="text-[0.7rem] font-light tracking-wide text-[var(--text-muted)] hover:text-[var(--app-text)] hover:underline sm:text-xs"
        >
          Архив
        </Link>
      }
    >
      <div className={`${ORDERS_MAIN_LAYOUT} space-y-4`}>
      <OrdersListKaitenChatShell
        orderIds={orders
          .filter((o) => o.kaitenCardId != null)
          .map((o) => o.id)}
        pollingEnabled={!isDemo}
      >
      <StickyListChrome
        className={ORDERS_LIST_STACK}
        toolbar={<div className="space-y-4">
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
      {periodError ? (
        <div className="no-print w-full rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
          {periodError} Фильтр по дате не применён.
        </div>
      ) : null}
      {periodLabelActive ? (
        <div className="no-print flex w-full flex-wrap items-center gap-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-sm dark:border-sky-900/50 dark:bg-sky-950/25 sm:px-4 sm:py-2.5 sm:text-base">
          <span className="text-[var(--text-body)]">
            Период (дата создания наряда, МСК):{" "}
            <strong className="font-mono text-[var(--text-strong)]">
              {periodLabelActive}
            </strong>
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
            Сбросить период
          </Link>
        </div>
      ) : null}
      <Suspense
        fallback={
          <div className="no-print text-sm text-[var(--text-muted)]">
            Поиск…
          </div>
        }
      >
        <div className="no-print w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <OrdersListSearch
              initialValue={listSearchQ}
              pageSize={pageSize}
              tag={rawTag ?? undefined}
              hideShipped={hideShippedActive}
              onlyShipped={onlyShippedActive}
              className="w-full min-w-0 lg:max-w-2xl lg:flex-none"
            />
            <OrdersListPeriodForm
              pageSize={pageSize}
              appliedFrom={fromUrl}
              appliedTo={toUrl}
              className="shrink-0"
            />
          </div>
        </div>
      </Suspense>
      {showOrdersQuickFilterChipsRow ? (
      <div className="no-print w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="flex flex-wrap items-center gap-2">
          {attentionCount > 0 ? (
            <Link
              href={ordersListHref({
                limit: pageSize,
                tag: LIST_TAG_ORDER_ATTENTION,
                hideShipped: hideShippedActive,
                onlyShipped: onlyShippedActive,
                q: listSearchQ || undefined,
                from: fromUrl ?? undefined,
                to: toUrl ?? undefined,
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
          {prostheticsPendingCount > 0 ? (
            <Link
              href={ordersListHref({
                limit: pageSize,
                tag: LIST_TAG_PROSTHETICS_PENDING,
                hideShipped: hideShippedActive,
                onlyShipped: onlyShippedActive,
                q: listSearchQ || undefined,
                from: fromUrl ?? undefined,
                to: toUrl ?? undefined,
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
          {labMentionCount > 0 ? (
            <Link
              href={ordersListHref({
                limit: pageSize,
                tag: LIST_TAG_KAITEN_LAB_MENTION,
                hideShipped: hideShippedActive,
                onlyShipped: onlyShippedActive,
                q: listSearchQ || undefined,
                from: fromUrl ?? undefined,
                to: toUrl ?? undefined,
              })}
              className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
                activeFilter?.kind === "kaitenLabMention"
                  ? "border-violet-400/90 bg-violet-100 text-violet-950 ring-2 ring-violet-500/90 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-100 dark:ring-violet-500/75"
                  : "border-violet-300/70 bg-violet-100/70 text-violet-950 hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-950/35 dark:text-violet-100 dark:hover:bg-violet-950/50"
              }`}
              title="Наряды, в чате карточки Kaiten которых упомянули команду лаборатории (@…)"
            >
              <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
                Упоминания
              </span>
              <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
                {labMentionCount}
              </span>
            </Link>
          ) : null}
        </div>
      </div>
      ) : null}
      {activeFilter ? (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-sm dark:border-sky-900/50 dark:bg-sky-950/25 sm:px-4 sm:py-2.5 sm:text-base">
          <span className="text-[var(--text-body)]">
            Фильтр по тегу:{" "}
            <strong className="text-[var(--text-strong)]">
              {humanListTagLabel(activeFilter)}
            </strong>
          </span>
          <Link
            href={ordersListHref({
              limit: pageSize,
              hideShipped: hideShippedActive,
              onlyShipped: onlyShippedActive,
              q: listSearchQ || undefined,
              from: fromUrl ?? undefined,
              to: toUrl ?? undefined,
            })}
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--sidebar-blue)] shadow-sm hover:bg-[var(--table-row-hover)]"
          >
            Показать все заказы
          </Link>
          {relatedOrdersListTagQuickFilters(activeFilter, {
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
                tag: opt.tag,
                hideShipped: hideShippedActive,
                onlyShipped: onlyShippedActive,
                q: listSearchQ || undefined,
                from: fromUrl ?? undefined,
                to: toUrl ?? undefined,
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
          })}
        </div>
      ) : rawTag ? (
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
        </div>}
      >
      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] [-webkit-overflow-scrolling:touch] print:max-w-none print:w-full">
        <table className="w-max min-w-0 border-collapse text-left text-sm">
          <thead className="sticky top-[var(--sticky-list-toolbar-height,0px)] z-30 print:static">
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase leading-snug tracking-wide text-[var(--text-secondary)] sm:text-xs md:text-sm">
              <th
                className="max-md:hidden min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center normal-case sm:px-2 sm:py-2"
                title="Чат карточки в Kaiten"
              >
                Чат
              </th>
              <th
                className="max-md:hidden min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center normal-case sm:px-2 sm:py-2"
                aria-label={
                  isDemo
                    ? "Печать PDF наряда и QR на карточку канбана"
                    : "Печать PDF наряда и QR на карточку Kaiten"
                }
                title={
                  isDemo
                    ? "Печать PDF наряда и QR на карточку канбана"
                    : "Печать PDF наряда и QR на карточку Kaiten"
                }
              >
                PDF · QR
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center sm:px-2 sm:py-2"
                title="№ наряда"
              >
                № наряда
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center sm:px-2 sm:py-2"
                title="Клиника"
              >
                Клиника
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center sm:px-2 sm:py-2"
                title="Адрес клиники"
              >
                Адрес
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center sm:px-2 sm:py-2"
                title="Врач"
              >
                Врач
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center sm:px-2 sm:py-2"
                title="Пациент"
              >
                Пациент
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center sm:px-2 sm:py-2"
                title="Поступление: когда работа зашла в лабораторию (без даты — дата занесения наряда)"
              >
                Поступление
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center sm:px-2 sm:py-2"
                title="Срок лабораторный"
              >
                Лаборатория
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-1.5 py-1.5 text-center sm:px-2 sm:py-2"
                title="Запись: дата и время приёма пациента"
              >
                Запись
              </th>
              <th
                className="min-w-[11rem] whitespace-nowrap px-1.5 py-1.5 text-center align-top normal-case sm:px-2 sm:py-2"
                title="Теги: нажмите — фильтр списка; «+» — добавить свой тег к наряду"
              >
                Отметки
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-10 text-center text-sm text-[var(--text-muted)]"
                >
                  {activeFilter
                    ? "Нет заказов с выбранным тегом на этой странице."
                    : listSearchQ
                      ? "Ничего не найдено по этому запросу. Измените текст поиска или сбросьте фильтр."
                      : periodLabelActive
                        ? "Нет нарядов с датой создания в выбранном периоде (МСК) на этой странице. Измените диапазон, сбросьте период или перейдите к следующей странице."
                        : onlyShippedActive
                          ? "Нет отгруженных нарядов на этой странице. Снимите фильтр «только отгруженные» или перейдите к следующей странице."
                          : hideShippedActive
                            ? "Нет нарядов без отметки «Работа отправлена» на этой странице. Снимите «Скрыть отгруженные» или перейдите к следующей странице."
                            : "Пока нет заказов. Сохраните наряд из формы «Новый заказ»."}
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const kaitenUrl =
                  o.kaitenCardId != null
                    ? getKaitenCardWebUrl(o.kaitenCardId)
                    : siteOrigin
                      ? `${siteOrigin.replace(/\/$/, "")}${kanbanOrderDeepLinkPath(o.id)}`
                      : null;
                const workSent = o.adminShippedOtpr;
                const blocked = o.kaitenBlocked === true;
                const rowClass =
                  blocked
                    ? "border-b-2 border-red-800/45 bg-gradient-to-r from-red-950/40 via-red-950/25 to-red-900/15 text-[var(--app-text)] dark:border-red-900/60 dark:from-red-950/50 dark:via-red-950/35 dark:to-red-950/20 [&>td:not(:first-child):not(:last-child)]:text-red-950/95 dark:[&>td:not(:first-child):not(:last-child)]:text-red-50/90"
                    : workSent
                      ? "border-b-2 border-emerald-400/55 bg-emerald-300/55 text-emerald-950/90 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100/85 [&>td:not(:first-child):not(:last-child)]:opacity-[0.28] [&>td:not(:first-child):not(:last-child)]:saturate-[0.65] [&>td:last-child]:opacity-[0.88]"
                      : "border-b-2 border-[var(--card-border)] transition-colors hover:bg-[var(--table-row-hover)]";
                return (
                <OrdersListTableRow
                  key={o.id}
                  orderId={o.id}
                  orderNumber={o.orderNumber}
                  className={rowClass}
                >
                  <OrderListOrderChatCell
                    orderId={o.id}
                    orderNumber={o.orderNumber}
                    labMentionHighlight={o.listKaitenLabMentionHighlight}
                  />
                  <td className="max-md:hidden min-w-0 px-1.5 py-1.5 align-middle sm:px-2 sm:py-2">
                    <div className="flex min-w-0 flex-nowrap items-center justify-start gap-0.5 sm:gap-1">
                      {!workSent ? (
                        <OrderNarjadPrintTrigger
                          orderId={o.id}
                          variant="icon"
                          title="Печать наряда (PDF) — диалог печати"
                        />
                      ) : null}
                      {kaitenUrl ? (
                        <OrderKaitenQrModal
                          url={kaitenUrl}
                          compact
                          variant={o.kaitenCardId != null && !isDemo ? "kaiten" : "kanban"}
                        />
                      ) : o.kaitenCardId != null ? (
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-xs text-amber-600 dark:text-amber-400 sm:h-7 sm:w-7 sm:text-sm"
                          title="Задайте KAITEN_WEB_ORIGIN или KAITEN_CARD_URL_TEMPLATE"
                        >
                          ⚠
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-[var(--text-muted)] sm:h-7 sm:w-7">
                          —
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="min-w-0 whitespace-nowrap px-1.5 py-1.5 align-middle font-mono font-medium text-[var(--app-text)] sm:px-2 sm:py-2">
                    <Link
                      href={orderPathById(o.id)}
                      className="text-[var(--sidebar-blue)] hover:underline"
                      title={`${o.orderNumber} — открыть наряд`}
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="min-w-0 max-w-[12rem] px-1.5 py-1.5 align-middle text-center text-[var(--text-strong)] sm:px-2 sm:py-2">
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
                  <td className="min-w-0 max-w-[12rem] px-1.5 py-1.5 align-middle text-center text-[var(--text-body)] sm:px-2 sm:py-2">
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
                  <td className="min-w-0 max-w-[10rem] px-1.5 py-1.5 align-middle text-center text-[var(--text-strong)] sm:px-2 sm:py-2">
                    <Link
                      href={`/clients/doctors/${o.doctor.id}`}
                      title={o.doctor.fullName}
                      className="block break-words text-center text-[var(--sidebar-blue)] hover:underline sm:leading-snug"
                    >
                      {personNameSurnameInitials(o.doctor.fullName)}
                    </Link>
                  </td>
                  <td
                    className="min-w-0 max-w-[10rem] px-1.5 py-1.5 align-middle text-center text-[var(--text-body)] sm:px-2 sm:py-2"
                    title={o.patientName ?? undefined}
                  >
                    <span className="block hyphens-auto break-words text-center">
                      {o.patientName
                        ? personNameSurnameInitials(o.patientName)
                        : "—"}
                    </span>
                  </td>
                  <td className="min-w-0 whitespace-nowrap px-1.5 py-1.5 align-middle text-center text-sm text-[var(--text-secondary)] sm:px-2 sm:py-2">
                    {formatAdmission(o)}
                  </td>
                  <td className="min-w-0 px-1.5 py-1.5 align-middle text-[var(--text-secondary)] sm:px-2 sm:py-2">
                    <OrderListDueCell
                      orderId={o.id}
                      dueIso={o.dueDate?.toISOString() ?? null}
                      createdAtIso={o.createdAt.toISOString()}
                      labHmSlots={labDueHmSlots}
                    />
                  </td>
                  <td className="min-w-0 px-1.5 py-1.5 align-middle text-[var(--text-secondary)] sm:px-2 sm:py-2">
                    <OrderListDueCell
                      variant="appointment"
                      orderId={o.id}
                      dueIso={
                        o.appointmentDate?.toISOString() ??
                        o.dueToAdminsAt?.toISOString() ??
                        null
                      }
                      createdAtIso={o.createdAt.toISOString()}
                    />
                  </td>
                  <td className="min-w-[11rem] px-1.5 py-1.5 align-top sm:px-2 sm:py-2">
                    <OrderListTagsCell
                      orderId={o.id}
                      pageSize={pageSize}
                      orderAttentionWarning={
                        o.listCompositionMismatch ||
                        o.listPendingChatCorrections
                      }
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
                    />
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
                  tag: rawTag ?? undefined,
                  hideShipped: hideShippedActive,
                  onlyShipped: onlyShippedActive,
                  q: listSearchQ || undefined,
                  from: fromUrl ?? undefined,
                  to: toUrl ?? undefined,
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
                  tag: rawTag ?? undefined,
                  hideShipped: hideShippedActive,
                  onlyShipped: onlyShippedActive,
                  q: listSearchQ || undefined,
                  from: fromUrl ?? undefined,
                  to: toUrl ?? undefined,
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
              />
            </div>
          ) : null}
        </div>
      ) : null}
      </StickyListChrome>
      </OrdersListKaitenChatShell>
      </div>
    </ModuleFrame>
  );
}
