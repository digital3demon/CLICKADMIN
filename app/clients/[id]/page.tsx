import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClinicLinkedDoctorsSection } from "@/components/clients/ClinicLinkedDoctorsSection";
import { ClinicCommercialTermsPanel } from "@/components/clients/ClinicCommercialTermsPanel";
import { ClinicOverviewEditCard } from "@/components/clients/ClinicOverviewEditCard";
import { ClinicPriceOverridesPanel } from "@/components/clients/ClinicPriceOverridesPanel";
import { ClientsBackLink } from "@/components/clients/ClientsBackLink";
import { ClientCardTabs } from "@/components/clients/ClientCardTabs";
import { ClientOrderPreviewButton } from "@/components/clients/ClientOrderPreviewButton";
import { ContractorDeletedNotice } from "@/components/clients/ContractorDeletedNotice";
import { FinancePanel } from "@/components/clients/FinancePanel";
import { RequisitesPanel } from "@/components/clients/RequisitesPanel";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import type { ClinicRequisiteKey } from "@/lib/clinic-requisites";
import { CLINIC_REQUISITE_ROWS } from "@/lib/clinic-requisites";
import {
  defaultFinanceMonthRangeUTC,
  loadOrderSentAtByIds,
  parseDateRangeUTC,
  sumClinicConstructionTotals,
} from "@/lib/clinic-finance";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getPrisma } from "@/lib/get-prisma";
import { repairDoctorLinksFromOrders } from "@/lib/repair-clinic-doctor-links";
import { syncClientCardOrderKaitenTitles } from "@/lib/client-card-kaiten-sync";
import {
  clientCardOrderStageLabel,
  formatClientCardShippedAt,
} from "@/lib/client-card-orders-table";
import { cleanLegalFullName } from "@/lib/document-workflow-markers";
import { listClinicOrderSourceEmails } from "@/lib/client-order-source-emails";

const ORDERS_PREVIEW = 100;

/** Next.js отдаёт значение query как строку или массив повторяющихся ключей. */
function firstSearchParam(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export const dynamic = "force-dynamic";

const CLIENT_CARD_ORDERS_INCLUDE = {
  doctor: { select: { fullName: true } },
  kaitenCardType: { select: { name: true } },
} as const;

type PageProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function requisitesInitialFromClinic(clinic: {
  name: string;
  address: string | null;
  legalFullName: string | null;
  legalAddress: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  bankName: string | null;
  bik: string | null;
  settlementAccount: string | null;
  correspondentAccount: string | null;
  phone: string | null;
  phoneAccounting: string | null;
  phoneManagement: string | null;
  email: string | null;
  ceoName: string | null;
}) {
  const base = {
    name: clinic.name,
    address: clinic.address ?? "",
  };
  const rest = {} as Record<ClinicRequisiteKey, string>;
  for (const { key } of CLINIC_REQUISITE_ROWS) {
    const v = clinic[key];
    rest[key] =
      key === "legalFullName"
        ? (cleanLegalFullName(String(v ?? "")) ?? "")
        : v != null
          ? String(v)
          : "";
  }
  return { ...base, ...rest };
}

export default async function ClientCardPage({ params, searchParams }: PageProps) {
  const { session, access } = await getSessionWithModuleAccess();
  const canEditClients =
    session?.role === "OWNER" || access?.CLIENTS_EDIT === true;

  const resolvedParams = params != null ? await params : null;
  const id = resolvedParams?.id?.trim() ?? "";
  if (!id) {
    notFound();
  }

  let query: Record<string, string | string[] | undefined> = {};
  if (searchParams != null) {
    const resolved = await searchParams;
    if (resolved && typeof resolved === "object") {
      query = resolved;
    }
  }
  const tab = firstSearchParam(query.tab);
  const returnToFromList = firstSearchParam(query.returnTo);
  const activeTab =
    tab === "requisites"
      ? "requisites"
      : tab === "finance"
        ? "finance"
        : tab === "price"
          ? "price"
        : "overview";

  const defaultMonth = defaultFinanceMonthRangeUTC();
  const fromQ = firstSearchParam(query.from);
  const toQ = firstSearchParam(query.to);
  const financeFrom =
    fromQ && /^\d{4}-\d{2}-\d{2}$/.test(fromQ) ? fromQ : defaultMonth.from;
  const financeTo =
    toQ && /^\d{4}-\d{2}-\d{2}$/.test(toQ) ? toQ : defaultMonth.to;
  const financeRange = parseDateRangeUTC(financeFrom, financeTo);

  let clinic;
  const prisma = await getPrisma();
  try {
    clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: { where: { archivedAt: null } },
            doctorLinks: true,
          },
        },
        contractDoc: { select: { updatedAt: true } },
        doctorLinks: {
          orderBy: { doctor: { fullName: "asc" } },
          include: {
            doctor: { select: { id: true, fullName: true, deletedAt: true } },
          },
        },
        orders: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: ORDERS_PREVIEW,
          include: CLIENT_CARD_ORDERS_INCLUDE,
        },
      },
    });
  } catch (e) {
    console.error("[client card] prisma", e);
    return (
      <ModuleFrame title="Клиент" description="">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-medium">Ошибка базы данных</p>
          <p className="mt-2">
            Выполните{" "}
            <code className="rounded bg-amber-100 px-1">npx prisma db push</code>
          </p>
          <ClientsBackLink
            returnToFromQuery={returnToFromList}
            className="mt-4 inline-block text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            ← К списку клиентов
          </ClientsBackLink>
        </div>
      </ModuleFrame>
    );
  }

  if (!clinic) {
    notFound();
  }

  const orderSourceEmails = await listClinicOrderSourceEmails(
    prisma,
    clinic.tenantId,
    id,
  );

  if (clinic.deletedAt) {
    return (
      <ModuleFrame
        title={clinic.name.split("\n")[0]?.trim() || "Клиника"}
        description="Запись удалена из списков."
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ClientsBackLink
            returnToFromQuery={returnToFromList}
            className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            ← Все клиенты
          </ClientsBackLink>
        </div>
        <ContractorDeletedNotice
          variant="clinic"
          id={id}
          title={clinic.name}
          deletedAtIso={clinic.deletedAt.toISOString()}
        />
      </ModuleFrame>
    );
  }

  /** Синхронизируем M:N по нарядам с этой клиникой; перечитываем карточку, чтобы счётчик и список совпали с БД. */
  if (clinic._count.orders > 0) {
    const previewOrderIds = clinic.orders.map((o) => o.id);
    try {
      await repairDoctorLinksFromOrders(prisma, id);
    } catch (e) {
      console.error("[client card] repair doctor links", e);
    }
    try {
      await syncClientCardOrderKaitenTitles(prisma, previewOrderIds);
    } catch (e) {
      console.error("[client card] kaiten titles", e);
    }
    clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: { where: { archivedAt: null } },
            doctorLinks: true,
          },
        },
        contractDoc: { select: { updatedAt: true } },
        doctorLinks: {
          orderBy: { doctor: { fullName: "asc" } },
          include: {
            doctor: { select: { id: true, fullName: true, deletedAt: true } },
          },
        },
        orders: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: ORDERS_PREVIEW,
          include: CLIENT_CARD_ORDERS_INCLUDE,
        },
      },
    });
    if (!clinic) {
      notFound();
    }
  }

  const sentAtByOrderId =
    clinic._count.orders > 0
      ? await loadOrderSentAtByIds(clinic.orders.map((o) => o.id))
      : new Map<string, Date | null>();

  const totalOrders = clinic._count.orders;
  const shownOrders = clinic.orders.length;
  const hasMoreOrders = totalOrders > shownOrders;

  let allTimeFinance = {
    totalRub: 0,
    lineCount: 0,
    linesWithoutPrice: 0,
  };
  let periodFinance = {
    totalRub: 0,
    lineCount: 0,
    linesWithoutPrice: 0,
  };
  if (activeTab === "finance" && financeRange) {
    [allTimeFinance, periodFinance] = await Promise.all([
      sumClinicConstructionTotals(id),
      sumClinicConstructionTotals(id, financeRange),
    ]);
  }

  const frameDescription =
    activeTab === "requisites"
      ? "Юридические и банковские реквизиты контрагента."
      : activeTab === "finance"
        ? "Оборот по позициям нарядов и выгрузка сверки."
        : activeTab === "price"
          ? "Индивидуальные цены по позициям текущего прайса."
        : "Карточка клиента: обзор, врачи и история заказов.";

  return (
    <ModuleFrame
      title={clinic.name.split("\n")[0]?.trim() || "Клиника"}
      description={frameDescription}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ClientsBackLink
          returnToFromQuery={returnToFromList}
          className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          ← Все клиенты
        </ClientsBackLink>
      </div>

      <ClientCardTabs
        basePath={`/clients/${id}`}
        active={activeTab}
        showPriceTab
      />

      {activeTab === "requisites" ? (
        <RequisitesPanel
          clinicId={id}
          canEditClients={canEditClients}
          initial={requisitesInitialFromClinic(clinic)}
        />
      ) : null}

      {activeTab === "finance" && financeRange ? (
        <Suspense
          fallback={
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-6 text-sm text-[var(--text-muted)]">
              Загрузка вкладки «Финансы»…
            </div>
          }
        >
          <FinancePanel
            clinicId={id}
            canEditClients={canEditClients}
            worksWithReconciliation={clinic.worksWithReconciliation === true}
            allTimeTotalRub={allTimeFinance.totalRub}
            allTimeLineCount={allTimeFinance.lineCount}
            allTimeWithoutPrice={allTimeFinance.linesWithoutPrice}
            periodFrom={financeFrom}
            periodTo={financeTo}
            periodTotalRub={periodFinance.totalRub}
            periodLineCount={periodFinance.lineCount}
            periodWithoutPrice={periodFinance.linesWithoutPrice}
          />
        </Suspense>
      ) : null}

      {activeTab === "finance" && !financeRange ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          Некорректный период. Откройте вкладку «Финансы» снова или задайте даты
          в формате ГГГГ-ММ-ДД.
        </div>
      ) : null}

      {activeTab === "price" ? (
        <ClinicPriceOverridesPanel clinicId={id} canEditClients={canEditClients} />
      ) : null}

      {activeTab === "overview" ? (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <ClinicOverviewEditCard
              clinicId={id}
              canEditClients={canEditClients}
              initialName={clinic.name}
              initialAddress={clinic.address ?? ""}
              initialNotes={clinic.notes ?? ""}
              initialIsActive={clinic.isActive}
              createdAt={clinic.createdAt}
              doctorCount={
                clinic.doctorLinks.filter((l) => l.doctor.deletedAt == null)
                  .length
              }
              orderCount={clinic._count.orders}
              orderSourceEmails={orderSourceEmails}
            />

            <ClinicLinkedDoctorsSection
              clinicId={id}
              canEditClients={canEditClients}
              initialLinks={clinic.doctorLinks}
            />
          </div>

          <div className="mt-6">
            <ClinicCommercialTermsPanel
              clinicId={id}
              canEditClients={canEditClients}
              initial={{
                billingLegalForm:
                  clinic.billingLegalForm === "IP" ||
                  clinic.billingLegalForm === "OOO"
                    ? clinic.billingLegalForm
                    : "",
                orderPriceListKind:
                  clinic.orderPriceListKind === "MAIN" ||
                  clinic.orderPriceListKind === "CUSTOM"
                    ? clinic.orderPriceListKind
                    : "",
                worksWithReconciliation: clinic.worksWithReconciliation,
                reconciliationFrequency:
                  clinic.reconciliationFrequency === "MONTHLY_1" ||
                  clinic.reconciliationFrequency === "MONTHLY_2"
                    ? clinic.reconciliationFrequency
                    : "",
                contractSigned: clinic.contractSigned,
                contractNumber: clinic.contractNumber ?? "",
                worksWithEdo: clinic.worksWithEdo,
                hasContractDoc: clinic.contractDoc != null,
              }}
            />
          </div>

          <section className="mt-8">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Заказы
              </h2>
              {hasMoreOrders ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Показаны последние {shownOrders} из {totalOrders}
                </p>
              ) : null}
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    <th className="px-3 py-3">Номер</th>
                    <th className="px-3 py-3">Врач</th>
                    <th className="px-3 py-3">Пациент</th>
                    <th className="px-3 py-3">Этап</th>
                    <th className="px-3 py-3">Срочно</th>
                    <th className="px-3 py-3">Создан</th>
                    <th className="px-3 py-3">Дата отгрузки</th>
                  </tr>
                </thead>
                <tbody>
                  {clinic.orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-[var(--text-muted)]"
                      >
                        По этой клинике заказов ещё нет.
                      </td>
                    </tr>
                  ) : (
                    clinic.orders.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--table-row-hover)]"
                      >
                        <td className="px-3 py-2.5">
                          <ClientOrderPreviewButton
                            orderId={o.id}
                            orderNumber={o.orderNumber}
                          />
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2.5 text-[var(--text-strong)]">
                          {o.doctor.fullName}
                        </td>
                        <td className="max-w-[160px] truncate px-3 py-2.5 text-[var(--text-body)]">
                          {o.patientName ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--text-strong)]">
                          {clientCardOrderStageLabel(o)}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--text-body)]">
                          {!o.isUrgent
                            ? "—"
                            : o.urgentCoefficient != null
                              ? `×${o.urgentCoefficient}`
                              : "Срочно"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">
                          {o.createdAt.toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">
                          {formatClientCardShippedAt(
                            o.adminShippedOtpr,
                            sentAtByOrderId.get(o.id),
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </ModuleFrame>
  );
}
