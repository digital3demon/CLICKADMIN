import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import {
  FinanceOfficeOrdersTable,
  type FinanceOfficeOrderTableRow,
} from "@/components/finance-office/FinanceOfficeOrdersTable";
import { FinanceOfficeBankImportPanel } from "@/components/finance-office/FinanceOfficeBankImportPanel";
import {
  FinanceOfficeTabNav,
  type FinanceOfficeTab,
} from "@/components/finance-office/FinanceOfficeTabNav";
import { FinanceOfficePeriodForm } from "@/components/finance-office/FinanceOfficePeriodForm";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { fetchFinanceOfficeOrders } from "@/lib/fetch-finance-office-orders";
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

export const dynamic = "force-dynamic";

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
  const orders = shouldFetch
    ? await fetchFinanceOfficeOrders(await getOrdersPrisma(), tenantId, {
        listTag: rawTagInvalid ? null : rawTag,
        search: q,
        start,
        endExclusive,
      })
    : [];
  const tagLabel = parsedTag ? humanListTagLabel(parsedTag) : null;

  return (
    <ModuleFrame
      title="ФинОтдел"
      description="Контроль просчёта, корректировок, заказа протетики и оплат. Банковская выгрузка сначала показывается построчно для проверки, затем применяется по кнопке «Сохранить»."
      descriptionClassName="max-w-4xl"
    >
      <div className="w-full max-w-full space-y-4">
        <FinanceOfficeBankImportPanel />
        <FinanceOfficeTabNav
          active={tab}
          periodFrom={fromRaw}
          periodTo={toRaw}
          listTag={rawTagInvalid ? null : rawTag}
          q={q}
        />
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
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2">
          <form action="/finance-office" className="flex min-w-[260px] flex-1 gap-2">
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
              className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Найти
            </button>
          </form>
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
        ) : (
          <FinanceOfficeOrdersTable
            orders={orders.map(serializeOrder)}
            activeTag={tagLabel}
            tab={tab}
            periodFrom={fromRaw}
            periodTo={toRaw}
            q={q}
          />
        )}
      </div>
    </ModuleFrame>
  );
}
