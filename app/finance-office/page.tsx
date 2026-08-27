import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import {
  FinanceOfficeOrdersTable,
  type FinanceOfficeOrderTableRow,
} from "@/components/finance-office/FinanceOfficeOrdersTable";
import { FinanceOfficeSelectionProvider } from "@/components/finance-office/finance-office-selection";
import { FinanceOfficePrintInvoicesButton } from "@/components/finance-office/FinanceOfficePrintInvoicesButton";
import { FinanceOfficeBankImportPanel } from "@/components/finance-office/FinanceOfficeBankImportPanel";
import { FinanceOfficeQuickFilterChips } from "@/components/finance-office/FinanceOfficeQuickFilterChips";
import { FinanceOfficeModePanel } from "@/components/finance-office/FinanceOfficeModePanel";
import { CorrectionsHistoryActionCard } from "@/components/orders/CorrectionsHistoryActionCard";
import { FinanceOfficeDebtsCard } from "@/components/finance-office/FinanceOfficeDebtsCard";
import { FinanceOfficeReconciliationsCard } from "@/components/finance-office/FinanceOfficeReconciliationsCard";
import { countOpenHighlightReconciliations } from "@/lib/legal-entity-reconciliation";
import { canAcceptOrderChatCorrections } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  fetchFinanceOfficeOrders,
} from "@/lib/fetch-finance-office-orders";
import { countOrdersWithPendingMergedCorrections } from "@/lib/order-chat-corrections-read";
import { countFinanceOfficeDebts } from "@/lib/finance-office-debts";
import { FINANCE_OFFICE_DEBT_DEFAULT_DAYS } from "@/lib/finance-office-debt-settings";
import {
  parseFinanceOfficeMode,
} from "@/lib/finance-office-list-filter";
import {
  humanListTagLabel,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";
import {
  financeOfficeListHref,
  parseFinanceOfficeInvoiceIssuedParams,
} from "@/lib/finance-office-list-query";
import {
  ordersShipmentModeLabel,
  parseOrdersShipmentParams,
} from "@/lib/orders-shipment-list-query";
import {
  moscowTomorrowYmd,
  parseYmdOrNull,
} from "@/lib/shipments-date-range";
import { fontDisplay } from "@/lib/app-fonts";

export const dynamic = "force-dynamic";

const FINANCE_OFFICE_LIST_STACK = "w-full max-w-full min-w-0 self-start space-y-4";

const FINANCE_OFFICE_FRAME_ROOT =
  "!px-2 !pb-6 !pt-4 sm:!px-3 sm:!pb-7 sm:!pt-5 md:!px-4 md:!pb-8 md:!pt-6 lg:!px-4 lg:!pb-9 lg:!pt-7";

const MAX_RANGE_DAYS = 366;

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
    appointmentDate: o.appointmentDate?.toISOString() ?? null,
    dueToAdminsAt: o.dueToAdminsAt?.toISOString() ?? null,
    kaitenCardId: o.kaitenCardId,
    kaitenColumnTitle: o.kaitenColumnTitle,
    kaitenTrackLane: o.kaitenTrackLane,
    demoKanbanColumn: o.demoKanbanColumn,
    kaitenCardType: o.kaitenCardType,
    clinic: o.clinic,
    counterpartyRequisitesText: o.counterpartyRequisitesText,
    doctor: o.doctor,
    payment: o.payment,
    paymentPartialRub: o.paymentPartialRub,
    adminShippedOtpr: o.adminShippedOtpr,
    adminShippedAt: o.adminShippedAt?.toISOString() ?? null,
    financeCalculated: o.financeCalculated,
    clinicWorksWithEdo: o.clinicWorksWithEdo,
    clinicUsesPaperDocs: o.clinicUsesPaperDocs,
    kaitenBlocked: o.kaitenBlocked,
    kaitenBlockReason: o.kaitenBlockReason,
    isUrgent: o.isUrgent,
    urgentCoefficient: o.urgentCoefficient,
    invoiceAttachmentId: o.invoiceAttachmentId,
    invoiceIssued: o.invoiceIssued,
    invoiceIssuedAt: o.invoiceIssuedAt?.toISOString() ?? null,
    invoiceNumber: o.invoiceNumber,
    invoicePrinted: o.invoicePrinted,
    updAttachmentId: o.updAttachmentId,
    updNumber: o.updNumber,
    updPrinted: o.updPrinted,
    invoicePaperDocs: o.invoicePaperDocs,
    invoiceSentToEdo: o.invoiceSentToEdo,
    invoiceEdoSigned: o.invoiceEdoSigned,
    prostheticsOrdered: o.prostheticsOrdered,
    listCustomTags: o.listCustomTags,
    listCompositionMismatch: o.listCompositionMismatch,
    listPendingChatCorrections: o.listPendingChatCorrections,
    listPendingProstheticsRequests: o.listPendingProstheticsRequests,
    listKaitenLabMentionHighlight: o.listKaitenLabMentionHighlight,
  };
}

export default async function FinanceOfficePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    from?: string;
    to?: string;
    tag?: string;
    q?: string;
    ship?: string;
    shipFrom?: string;
    shipTo?: string;
    invFrom?: string;
    invTo?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  const canAcceptCorrections =
    session != null && canAcceptOrderChatCorrections(session.role);

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
  const mode = parseFinanceOfficeMode(sp.tab);
  const fromRaw = parseYmdOrNull(sp.from ?? null);
  const toRaw = parseYmdOrNull(sp.to ?? null);
  const shipParsed = parseOrdersShipmentParams({
    ship: sp.ship,
    shipFrom: sp.shipFrom,
    shipTo: sp.shipTo,
  });
  const appointment =
    shipParsed.mode && !shipParsed.periodError
      ? {
          mode: shipParsed.mode,
          shipFrom: shipParsed.shipFrom,
          shipTo: shipParsed.shipTo,
        }
      : null;
  const invParsed = parseFinanceOfficeInvoiceIssuedParams({
    invFrom: sp.invFrom,
    invTo: sp.invTo,
  });
  const invoiceIssued =
    invParsed.toYmd && !invParsed.error
      ? { fromYmd: invParsed.fromYmd, toYmd: invParsed.toYmd }
      : null;
  let error: string | null = null;
  let rangeSummary: string | null = null;

  if (invParsed.error) {
    error = invParsed.error;
  } else if (invoiceIssued) {
    if (
      invoiceIssued.fromYmd &&
      rangeDaySpan(invoiceIssued.fromYmd, invoiceIssued.toYmd) > MAX_RANGE_DAYS
    ) {
      error = `Максимальный период — ${MAX_RANGE_DAYS} дней. Сузьте диапазон.`;
    } else if (invoiceIssued.fromYmd) {
      rangeSummary = `Счёт выставлен (МСК): с ${invoiceIssued.fromYmd} по ${invoiceIssued.toYmd}, все этапы воронки`;
    } else {
      rangeSummary = `Счёт выставлен (МСК): по ${invoiceIssued.toYmd} (включая прошлые), все этапы воронки`;
    }
  } else if (shipParsed.periodError) {
    error = shipParsed.periodError;
  } else if (appointment) {
    const apptLabel = ordersShipmentModeLabel(shipParsed);
    rangeSummary = apptLabel
      ? `Запись (МСК): ${apptLabel}, все этапы воронки`
      : "Запись: фильтр по дате приёма, все этапы воронки";
  } else if (mode === "actual") {
    rangeSummary = `Актуальное: непросчитанные с лаб-сроком до завтра (${moscowTomorrowYmd()} МСК), все этапы воронки`;
  } else if (!toRaw) {
    error = "Укажите дату «по» и нажмите «Показать».";
  } else if (fromRaw && fromRaw > toRaw) {
    error = "Дата «с» не может быть позже даты «по».";
  } else if (fromRaw && rangeDaySpan(fromRaw, toRaw) > MAX_RANGE_DAYS) {
    error = `Максимальный период — ${MAX_RANGE_DAYS} дней. Сузьте диапазон.`;
  } else if (fromRaw) {
    rangeSummary = `Лаб-срок (МСК): с ${fromRaw} по ${toRaw}, все этапы воронки`;
  } else {
    rangeSummary = `Лаб-срок (МСК): по ${toRaw} (включая прошлые), все этапы воронки`;
  }

  const shouldFetch =
    !error &&
    (Boolean(invoiceIssued) ||
      Boolean(appointment) ||
      mode === "actual" ||
      (mode === "period" && Boolean(toRaw)));
  const ordersPrisma = await getOrdersPrisma();
  const [orders, correctionsPendingCount, debtsCount, reconHighlightCount] = await Promise.all([
    shouldFetch && !error
      ? fetchFinanceOfficeOrders(ordersPrisma, tenantId, {
          listTag: rawTagInvalid ? null : rawTag,
          search: q,
          mode,
          fromYmd:
            invoiceIssued || appointment
              ? null
              : mode === "period"
                ? fromRaw
                : null,
          toYmd:
            invoiceIssued || appointment
              ? null
              : mode === "period"
                ? toRaw
                : null,
          userId: session?.sub,
          appointment: invoiceIssued ? null : appointment,
          invoiceIssued,
        })
      : Promise.resolve(
          [] as Awaited<ReturnType<typeof fetchFinanceOfficeOrders>>,
        ),
    countOrdersWithPendingMergedCorrections(ordersPrisma, tenantId),
    ordersPrisma.tenant
      .findUnique({
        where: { id: tenantId },
        select: { financeOfficeDebtWorkingDays: true },
      })
      .then((t) =>
        countFinanceOfficeDebts(
          ordersPrisma,
          tenantId,
          t?.financeOfficeDebtWorkingDays ?? FINANCE_OFFICE_DEBT_DEFAULT_DAYS,
        ),
      ),
    countOpenHighlightReconciliations(ordersPrisma, tenantId),
  ]);
  const tagLabel = parsedTag ? humanListTagLabel(parsedTag) : null;
  const listRangeSummary =
    tagLabel && rangeSummary
      ? `${tagLabel} · ${rangeSummary}`
      : rangeSummary;
  const listSummaryLine =
    listRangeSummary && shouldFetch && !error
      ? `${listRangeSummary} · нарядов: ${orders.length}`
      : null;
  const exportParams = new URLSearchParams();
  exportParams.set("tab", mode);
  if (fromRaw) exportParams.set("from", fromRaw);
  if (toRaw) exportParams.set("to", toRaw);
  if (rawTag && !rawTagInvalid) exportParams.set("tag", rawTag);
  if (q) exportParams.set("q", q);
  if (invoiceIssued) {
    if (invoiceIssued.fromYmd) exportParams.set("invFrom", invoiceIssued.fromYmd);
    exportParams.set("invTo", invoiceIssued.toYmd);
  } else if (appointment) {
    exportParams.set("ship", appointment.mode);
    if (appointment.shipFrom) exportParams.set("shipFrom", appointment.shipFrom);
    if (appointment.shipTo) exportParams.set("shipTo", appointment.shipTo);
  }
  const exportHref = `/api/finance-office/export?${exportParams.toString()}`;
  const tableOrders =
    error || !shouldFetch ? [] : orders.map(serializeOrder);
  const orderIdsWithInvoice = tableOrders
    .filter((o) => o.invoiceAttachmentId)
    .map((o) => o.id);
  const searchControls = (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <form
        action="/finance-office"
        className="flex min-w-0 max-w-xl flex-1 flex-col gap-2 sm:min-w-[220px] sm:flex-row"
      >
        <input type="hidden" name="tab" value={mode} />
        {fromRaw ? <input type="hidden" name="from" value={fromRaw} /> : null}
        {toRaw ? <input type="hidden" name="to" value={toRaw} /> : null}
        {appointment ? (
          <input type="hidden" name="ship" value={appointment.mode} />
        ) : null}
        {appointment?.shipFrom ? (
          <input type="hidden" name="shipFrom" value={appointment.shipFrom} />
        ) : null}
        {appointment?.shipTo ? (
          <input type="hidden" name="shipTo" value={appointment.shipTo} />
        ) : null}
        {invoiceIssued?.fromYmd ? (
          <input type="hidden" name="invFrom" value={invoiceIssued.fromYmd} />
        ) : null}
        {invoiceIssued ? (
          <input type="hidden" name="invTo" value={invoiceIssued.toYmd} />
        ) : null}
        {rawTag && !rawTagInvalid ? (
          <input type="hidden" name="tag" value={rawTag} />
        ) : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по номеру наряда или пациенту"
          className="min-w-0 w-full max-w-md flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none"
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
        <FinanceOfficePrintInvoicesButton
          orderIdsWithInvoice={orderIdsWithInvoice}
        />
        {rawTag || q ? (
          <Link
            href={financeOfficeListHref({
              tab: mode,
              from: fromRaw,
              to: toRaw,
              ship: invoiceIssued ? undefined : appointment?.mode,
              shipFrom: invoiceIssued ? undefined : appointment?.shipFrom,
              shipTo: invoiceIssued ? undefined : appointment?.shipTo,
              invFrom: invoiceIssued?.fromYmd,
              invTo: invoiceIssued?.toYmd,
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
    <section className="space-y-3">
      <div>
        <h1
          className={`${fontDisplay.className} text-xl font-semibold tracking-tight text-[var(--app-text)] lg:text-2xl`}
        >
          ФинОтдел
        </h1>
        <p className="mt-2 hidden max-w-4xl text-sm leading-snug text-[var(--text-secondary)] md:block">
          Контроль просчёта, корректировок, заказа протетики и оплат.
          Список без ограничения по этапу воронки (включая согласование и
          ранние этапы).
        </p>
      </div>
      {/* Режим · долги · корректировки · выписка */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(10rem,12rem)_minmax(10rem,12rem)_minmax(10rem,12rem)_minmax(16rem,22rem)] xl:items-stretch">
        <FinanceOfficeModePanel
          mode={mode}
          appliedFrom={fromRaw}
          appliedTo={toRaw}
          listTag={rawTagInvalid ? null : rawTag}
          q={q}
          listSummaryLine={listSummaryLine}
        />
        <FinanceOfficeDebtsCard
          className="h-full w-full max-w-[13rem] justify-self-stretch"
          initialCount={debtsCount}
        />
        <FinanceOfficeReconciliationsCard
          className="h-full w-full max-w-[13rem] justify-self-stretch"
          initialHighlightCount={reconHighlightCount}
        />
        <CorrectionsHistoryActionCard
          dense
          className="h-full w-full max-w-[13rem] justify-self-stretch"
          initialPendingCount={correctionsPendingCount}
          canAcceptCorrections={canAcceptCorrections}
        />
        <FinanceOfficeBankImportPanel compact className="h-full w-full" />
      </div>
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2">
        {searchControls}
      </div>
      <div className="space-y-2">
        {rawTagInvalid ? (
          <p className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            Параметр фильтра не распознан, показан общий список ФинОтдела.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
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
      <FinanceOfficeSelectionProvider>
      <div className={FINANCE_OFFICE_LIST_STACK}>
        {financeOfficeHeader}
        {shouldFetch && !error ? (
          <FinanceOfficeQuickFilterChips
            activeFilter={parsedTag}
            tab={mode}
            periodFrom={fromRaw}
            periodTo={toRaw}
            q={q}
            listTag={rawTagInvalid ? null : rawTag}
            ship={invoiceIssued ? null : appointment?.mode ?? null}
            shipFrom={invoiceIssued ? null : appointment?.shipFrom ?? null}
            shipTo={invoiceIssued ? null : appointment?.shipTo ?? null}
            invFrom={invoiceIssued?.fromYmd ?? null}
            invTo={invoiceIssued?.toYmd ?? null}
          />
        ) : null}
        <FinanceOfficeOrdersTable
          orders={tableOrders}
          activeTag={tagLabel}
          tab={mode}
          periodFrom={fromRaw}
          periodTo={toRaw}
          q={q}
          listTag={rawTagInvalid ? null : rawTag}
          shipMode={invoiceIssued ? null : appointment?.mode ?? null}
          shipFrom={invoiceIssued ? null : appointment?.shipFrom ?? null}
          shipTo={invoiceIssued ? null : appointment?.shipTo ?? null}
          invFrom={invoiceIssued?.fromYmd ?? null}
          invTo={invoiceIssued?.toYmd ?? null}
          exportHref={exportHref}
        />
      </div>
      </FinanceOfficeSelectionProvider>
    </ModuleFrame>
  );
}
