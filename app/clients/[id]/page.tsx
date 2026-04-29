import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClinicLinkedDoctorsSection } from "@/components/clients/ClinicLinkedDoctorsSection";
import { ClinicCommercialTermsPanel } from "@/components/clients/ClinicCommercialTermsPanel";
import { ClinicOverviewEditCard } from "@/components/clients/ClinicOverviewEditCard";
import { ClinicPriceOverridesPanel } from "@/components/clients/ClinicPriceOverridesPanel";
import { ClientCardTabs } from "@/components/clients/ClientCardTabs";
import { ContractorDeletedNotice } from "@/components/clients/ContractorDeletedNotice";
import { FinancePanel } from "@/components/clients/FinancePanel";
import { RequisitesPanel } from "@/components/clients/RequisitesPanel";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import type { ClinicRequisiteKey } from "@/lib/clinic-requisites";
import { CLINIC_REQUISITE_ROWS } from "@/lib/clinic-requisites";
import {
  defaultFinanceMonthRangeUTC,
  parseDateRangeUTC,
  sumClinicConstructionTotals,
} from "@/lib/clinic-finance";
import { getPrisma } from "@/lib/get-prisma";
import { repairDoctorLinksFromOrders } from "@/lib/repair-clinic-doctor-links";
import {
  LAB_WORK_STATUS_LABELS,
  normalizeLegacyLabWorkStatus,
  type LabWorkStatus,
} from "@/lib/lab-work-status";

const ORDERS_PREVIEW = 100;

/** Next.js отдаёт значение query как строку или массив повторяющихся ключей. */
function firstSearchParam(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export const dynamic = "force-dynamic";

function labelForLabStatus(status: string): string {
  const s = normalizeLegacyLabWorkStatus(status);
  return LAB_WORK_STATUS_LABELS[s as LabWorkStatus];
}

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
    rest[key] = v != null ? String(v) : "";
  }
  return { ...base, ...rest };
}

export default async function ClientCardPage({ params, searchParams }: PageProps) {
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
        _count: { select: { orders: true, doctorLinks: true } },
        doctorLinks: {
          orderBy: { doctor: { fullName: "asc" } },
          include: {
            doctor: { select: { id: true, fullName: true, deletedAt: true } },
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: ORDERS_PREVIEW,
          include: {
            doctor: { select: { fullName: true } },
          },
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
          <Link
            href="/clients"
            className="mt-4 inline-block text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            ← К списку клиентов
          </Link>
        </div>
      </ModuleFrame>
    );
  }

  if (!clinic) {
    notFound();
  }

  if (clinic.deletedAt) {
    return (
      <ModuleFrame
        title={clinic.name.split("\n")[0]?.trim() || "Клиника"}
        description="Запись удалена из списков."
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/clients"
            className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            ← Все клиенты
          </Link>
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
    try {
      await repairDoctorLinksFromOrders(prisma, id);
    } catch (e) {
      console.error("[client card] repair doctor links", e);
    }
    clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true, doctorLinks: true } },
        doctorLinks: {
          orderBy: { doctor: { fullName: "asc" } },
          include: {
            doctor: { select: { id: true, fullName: true, deletedAt: true } },
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: ORDERS_PREVIEW,
          include: {
            doctor: { select: { fullName: true } },
          },
        },
      },
    });
    if (!clinic) {
      notFound();
    }
  }

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
        <Link
          href="/clients"
          className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          ← Все клиенты
        </Link>
      </div>

      <ClientCardTabs basePath={`/clients/${id}`} active={activeTab} showPriceTab />

      {activeTab === "requisites" ? (
        <RequisitesPanel
          clinicId={id}
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

      {activeTab === "price" ? <ClinicPriceOverridesPanel clinicId={id} /> : null}

      {activeTab === "overview" ? (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <ClinicOverviewEditCard
              clinicId={id}
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
            />

            <ClinicLinkedDoctorsSection
              clinicId={id}
              initialLinks={clinic.doctorLinks}
            />
          </div>

          <div className="mt-6">
            <ClinicCommercialTermsPanel
              clinicId={id}
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
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    <th className="px-3 py-3">Номер</th>
                    <th className="px-3 py-3">Врач</th>
                    <th className="px-3 py-3">Пациент</th>
                    <th className="px-3 py-3">Этап</th>
                    <th className="px-3 py-3">Срочно</th>
                    <th className="px-3 py-3">Создан</th>
                  </tr>
                </thead>
                <tbody>
                  {clinic.orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
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
                        <td className="px-3 py-2.5 font-mono font-medium text-[var(--app-text)]">
                          {o.orderNumber}
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2.5 text-[var(--text-strong)]">
                          {o.doctor.fullName}
                        </td>
                        <td className="max-w-[160px] truncate px-3 py-2.5 text-[var(--text-body)]">
                          {o.patientName ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--text-strong)]">
                          {labelForLabStatus(String(o.labWorkStatus))}
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
