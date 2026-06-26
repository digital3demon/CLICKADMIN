import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import {
  FinanceOfficeOrdersTable,
  type FinanceOfficeOrderTableRow,
} from "@/components/finance-office/FinanceOfficeOrdersTable";
import { FinanceOfficeBankImportPanel } from "@/components/finance-office/FinanceOfficeBankImportPanel";
import { FinanceOfficeQuickFilterChips } from "@/components/finance-office/FinanceOfficeQuickFilterChips";
import {
  FinanceOfficeTabNav,
  type FinanceOfficeTab,
} from "@/components/finance-office/FinanceOfficeTabNav";
import { FinanceOfficePeriodForm } from "@/components/finance-office/FinanceOfficePeriodForm";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { fetchFinanceOfficeOrders, countFinanceOfficeQuickFilterChips } from "@/lib/fetch-finance-office-orders";
import {
  humanListTagLabel,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import {
  addCalendarDaysYmd,
  moscowShipmentDayBoundsUtc,
  moscowShipmentInclusiveRangeBoundsUtc,
  moscowTodayYmd,
  moscowTomorrowYmd,
  parseYmdOrNull,
} from "@/lib/shipments-date-range";
import { fontDisplay } from "@/lib/app-fonts";

export const dynamic = "force-dynamic";

const FINANCE_OFFICE_LIST_STACK = "w-full max-w-full min-w-0 self-start space-y-4";

const FINANCE_OFFICE_FRAME_ROOT =
  "!px-2 !pb-6 !pt-4 sm:!px-3 sm:!pb-7 sm:!pt-5 md:!px-4 md:!pb-8 md:!pt-6 lg:!px-4 lg:!pb-9 lg:!pt-7";

const MAX_RANGE_DAYS = 366;

function parseTab(raw: string | undefined): FinanceOfficeTab {
  if (raw === "tomorrow" || raw === "period" || raw === "today") return raw;
  return "today";
}

function rangeDaySpan(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / (24 * 60 * 60 * 1000));
}

function serializeOrder(o: Awaited<ReturnType<typeof fetchFinanceOfficeOrders>>[number]): FinanceOfficeOrderTableRow {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    patientName: o.patientName,
    createdAt: o.createdAt.toISOString(),
    legalEntity: o.legalEntity,
    dueDate: o.dueDate?.toISOString() ?? null,
    kaitenCardId: o.kaitenCardId,
    kaitenColumnTitle: o.kaitenColumnTitle,
    demoKanbanColumn: o.demoKanbanColumn,
    kaitenCardType: o.kaitenCardType,
    clinic: o.clinic,
    counterpartyRequisitesText: o.counterpartyRequisitesText,
    doctor: o.doctor,
    payment: o.payment,
    paymentPartialRub: o.paymentPartialRub,
    adminShippedOtpr: o.adminShippedOtpr,
    financeCalculated: o.financeCalculated,
    kaitenBlocked: o.kaitenBlocked,
    kaitenBlockReason: o.kaitenBlockReason,
    isUrgent: o.isUrgent,
    urgentCoefficient: o.urgentCoefficient,
    invoiceAttachmentId: o.invoiceAttachmentId,
    invoicePrinted: o.invoicePrinted,
    prostheticsOrdered: o.prostheticsOrdered,
    listCustomTags: o.listCustomTags,
    listCompositionMismatch: o.listCompositionMismatch,
    listPendingChatCorrections: o.listPendingChatCorrections,
    listPendingProstheticsRequests: o.listPendingProstheticsRequests,
  };
}

export default async function FinanceOfficePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; tag?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;

  if (!tenantId) {
    return (
      <ModuleFrame title="ФинОтдел" description="">
        <p className="text-sm text-[var(--text-secondary)]">
          Войдите в CRM, чтобы открыть ФинОтдел.
        </p>
      </ModuleFrame>
    );
  }

  const rawTag = sp.tag?.trim() || null;
  const parsedTag = rawTag ? parseListTagParam(rawTag) : null;
  const rawTagInvalid = Boolean(rawTag && !parsedTag);
  const q = sp.q?.trim() || "";
  const tab = parseTab(sp.tab);
  const todayYmd = moscowTodayYmd();
  const defaultFrom = addCalendarDaysYmd(todayYmd, -7);
  const defaultTo = todayYmd;
  const fromRaw = parseYmdOrNull(sp.from ?? null);
  const toRaw = parseYmdOrNull(sp.to ?? null);
  let error: string | null = null;
  let start: Date | null = null;
  let endExclusive: Date | null = null;
  let rangeSummary: string | null = null;

  if (tab === "today") {
    const bounds = moscowShipmentDayBoundsUtc(todayYmd);
    start = bounds.start;
    endExclusive = bounds.endExclusive;
    rangeSummary = `Срок лаборатории (МСК), окно ${todayYmd} 00:00 — ${addCalendarDaysYmd(todayYmd, 1)} 12:00`;
  } else if (tab === "tomorrow") {
    const ymd = moscowTomorrowYmd();
    const bounds = moscowShipmentDayBoundsUtc(ymd);
    start = bounds.start;
    endExclusive = bounds.endExclusive;
    rangeSummary = `Срок лаборатории (МСК), окно ${ymd} 00:00 — ${addCalendarDaysYmd(ymd, 1)} 12:00`;
  } else if (fromRaw && toRaw) {
    if (fromRaw > toRaw) {
      error = "Дата «с» не может быть позже даты «по».";
    } else if (rangeDaySpan(fromRaw, toRaw) > MAX_RANGE_DAYS) {
      error = `Максимальный период — ${MAX_RANGE_DAYS} дней. Сузьте диапазон.`;
    } else {
      const bounds = moscowShipmentInclusiveRangeBoundsUtc(fromRaw, toRaw);
      start = bounds.start;
      endExclusive = bounds.endExclusive;
      rangeSummary = `Срок лаборатории (МСК), окна от ${fromRaw} до ${addCalendarDaysYmd(toRaw, 1)} 12:00`;
    }
  }

  const shouldFetch = tab !== "period" || Boolean(start && endExclusive && !error);
  const ordersPrisma = shouldFetch ? await getOrdersPrisma() : null;
  const orders = ordersPrisma
    ? await fetchFinanceOfficeOrders(ordersPrisma, tenantId, {
        listTag: rawTagInvalid ? null : rawTag,
        search: q,
        start,
        endExclusive,
      })
    : [];
  const chipCounts =
    ordersPrisma && shouldFetch && !error
      ? await countFinanceOfficeQuickFilterChips(ordersPrisma, tenantId, {
          search: q,
        })
      : { attentionCount: 0, prostheticsPendingCount: 0 };
  const tagLabel = parsedTag ? humanListTagLabel(parsedTag) : null;
  const exportParams = new URLSearchParams();
  exportParams.set("tab", tab);
  if (fromRaw) exportParams.set("from", fromRaw);
  if (toRaw) exportParams.set("to", toRaw);
  if (rawTag && !rawTagInvalid) exportParams.set("tag", rawTag);
  if (q) exportParams.set("q", q);
  const exportHref = `/api/finance-office/export?${exportParams.toString()}`;
  const searchControls = (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <form action="/finance-office" className="flex min-w-0 flex-1 flex-col gap-2 sm:min-w-[260px] sm:flex-row">
        <input type="hidden" name="tab" value={tab} />
        {fromRaw ? <input type="hidden" name="from" value={fromRaw} /> : null}
        {toRaw ? <input type="hidden" name="to" value={toRaw} /> : null}
        {rawTag && !rawTagInvalid ? <input type="hidden" name="tag" value={rawTag} /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по номеру наряда или пациенту"
          className="min-w-0 flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 sm:shrink-0"
        >
          Найти
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={exportHref}
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:bg-emerald-950/55"
        >
          Выгрузить
        </a>
        {(rawTag || q) ? (
          <Link
            href={financeOfficeListHref({
              tab,
              from: fromRaw,
              to: toRaw,
            })}
            className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
          >
            Сбросить
          </Link>
        ) : null}
      </div>
    </div>
  );
  const financeOfficeHeader = (
    <section>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] xl:items-end">
        <div className="min-w-0 space-y-3">
          <div>
            <h1 className={`${fontDisplay.className} text-xl font-semibold tracking-tight text-[var(--app-text)] lg:text-2xl`}>
              ФинОтдел
            </h1>
            <p className="mt-2 hidden max-w-4xl text-sm leading-snug text-[var(--text-secondary)] md:block">
              Контроль просчёта, корректировок, заказа протетики и оплат.
              Банковская выгрузка сначала показывается построчно для проверки,
              затем применяется по кнопке «Сохранить».
            </p>
          </div>
          <FinanceOfficeTabNav
            active={tab}
            periodFrom={fromRaw}
            periodTo={toRaw}
            listTag={rawTagInvalid ? null : rawTag}
            q={q}
          />
          <div className="space-y-2">
            {tab === "period" ? (
              <FinanceOfficePeriodForm
                appliedFrom={fromRaw}
                appliedTo={toRaw}
                defaultFrom={defaultFrom}
                defaultTo={defaultTo}
                preserveListTag={rawTagInvalid ? null : rawTag}
                q={q}
                receptionSummary={
                  shouldFetch && rangeSummary
                    ? `${rangeSummary} · нарядов: ${orders.length}`
                    : null
                }
              />
            ) : rangeSummary ? (
              <p className="text-sm font-medium text-[var(--text-body)]">
                {rangeSummary} · нарядов: {orders.length}
              </p>
            ) : null}
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2">
              {searchControls}
            </div>
          </div>
        </div>
        <FinanceOfficeBankImportPanel className="w-full xl:self-end" />
      </div>
      <div className="mt-3 space-y-2">
        {rawTagInvalid ? (
          <p className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            Параметр фильтра не распознан, показан общий список ФинОтдела.
          </p>
        ) : tagLabel ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-sm dark:border-sky-900/50 dark:bg-sky-950/25">
            <span>
              Фильтр: <strong>{tagLabel}</strong>
            </span>
            <Link
              href={financeOfficeListHref({
                tab,
                from: fromRaw,
                to: toRaw,
                q,
              })}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--sidebar-blue)] shadow-sm hover:bg-[var(--table-row-hover)]"
            >
              Показать все
            </Link>
          </div>
        ) : null}
        {error ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </p>
        ) : tab === "period" && !shouldFetch ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Укажите даты и нажмите «Показать», чтобы загрузить список ФинОтдела.
          </p>
        ) : null}
      </div>
    </section>
  );

  return (
    <ModuleFrame
      title="ФинОтдел"
      rootClassName={`[&_.module-frame-header]:hidden ${FINANCE_OFFICE_FRAME_ROOT}`}
    >
      <div className={FINANCE_OFFICE_LIST_STACK}>
        {financeOfficeHeader}
        {shouldFetch && !error ? (
          <FinanceOfficeQuickFilterChips
            attentionCount={chipCounts.attentionCount}
            prostheticsPendingCount={chipCounts.prostheticsPendingCount}
            activeFilter={parsedTag}
            tab={tab}
            periodFrom={fromRaw}
            periodTo={toRaw}
            q={q}
          />
        ) : null}
        <FinanceOfficeOrdersTable
          orders={error || (tab === "period" && !shouldFetch) ? [] : orders.map(serializeOrder)}
          activeTag={tagLabel}
          tab={tab}
          periodFrom={fromRaw}
          periodTo={toRaw}
          q={q}
        />
      </div>
    </ModuleFrame>
  );
}
