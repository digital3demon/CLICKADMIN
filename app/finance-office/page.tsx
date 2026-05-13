import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import {
  FinanceOfficeOrdersTable,
  type FinanceOfficeOrderTableRow,
} from "@/components/finance-office/FinanceOfficeOrdersTable";
import { FinanceOfficeBankImportPanel } from "@/components/finance-office/FinanceOfficeBankImportPanel";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { fetchFinanceOfficeOrders } from "@/lib/fetch-finance-office-orders";
import {
  humanListTagLabel,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";

export const dynamic = "force-dynamic";

function serializeOrder(o: Awaited<ReturnType<typeof fetchFinanceOfficeOrders>>[number]): FinanceOfficeOrderTableRow {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    patientName: o.patientName,
    legalEntity: o.legalEntity,
    dueDate: o.dueDate?.toISOString() ?? null,
    clinic: o.clinic,
    counterpartyRequisitesText: o.counterpartyRequisitesText,
    doctor: o.doctor,
    payment: o.payment,
    paymentPartialRub: o.paymentPartialRub,
    financeCalculated: o.financeCalculated,
    listCompositionMismatch: o.listCompositionMismatch,
    listPendingChatCorrections: o.listPendingChatCorrections,
    listPendingProstheticsRequests: o.listPendingProstheticsRequests,
  };
}

export default async function FinanceOfficePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>;
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
  const orders = await fetchFinanceOfficeOrders(await getOrdersPrisma(), tenantId, {
    listTag: rawTagInvalid ? null : rawTag,
    search: q,
  });
  const tagLabel = parsedTag ? humanListTagLabel(parsedTag) : null;

  return (
    <ModuleFrame
      title="ФинОтдел"
      description="Контроль просчёта, корректировок, заказа протетики и оплат. Банковская выгрузка сначала показывается построчно для проверки, затем применяется по кнопке «Сохранить»."
      descriptionClassName="max-w-4xl"
    >
      <div className="w-full max-w-full space-y-4">
        <FinanceOfficeBankImportPanel />
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2">
          <form action="/finance-office" className="flex min-w-[260px] flex-1 gap-2">
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
              href={financeOfficeListHref()}
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
              href={financeOfficeListHref({ q })}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--sidebar-blue)] shadow-sm hover:bg-[var(--table-row-hover)]"
            >
              Показать все
            </Link>
          </div>
        ) : null}
        <FinanceOfficeOrdersTable
          orders={orders.map(serializeOrder)}
          activeTag={tagLabel}
        />
      </div>
    </ModuleFrame>
  );
}
