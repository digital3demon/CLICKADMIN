import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientCardOrdersTable } from "@/components/clients/ClientCardOrdersTable";
import { ClientCardTabs } from "@/components/clients/ClientCardTabs";
import { ClientsBackLink } from "@/components/clients/ClientsBackLink";
import { ContractorDeletedNotice } from "@/components/clients/ContractorDeletedNotice";
import { DoctorLinkedClinicsCount } from "@/components/clients/DoctorLinkedClinicsCount";
import { DoctorLinkedClinicsSection } from "@/components/clients/DoctorLinkedClinicsSection";
import { ClinicCommercialTermsPanel } from "@/components/clients/ClinicCommercialTermsPanel";
import { DoctorFinancePanel } from "@/components/clients/DoctorFinancePanel";
import { DoctorProfilePanel } from "@/components/clients/DoctorProfilePanel";
import type { DoctorProfileFormState } from "@/components/clients/DoctorProfilePanel";
import { RequisitesPanel } from "@/components/clients/RequisitesPanel";
import { requisitesFormStateFromClinic } from "@/lib/clinic-requisites";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { displayOrDash } from "@/lib/format-display";
import {
  defaultFinanceMonthRangeUTC,
  parseDateRangeUTC,
  sumDoctorConstructionTotals,
} from "@/lib/clinic-finance";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { ClientOrderSourceEmailsField } from "@/components/clients/ClientOrderSourceEmailsField";
import { listDoctorOrderSourceEmails } from "@/lib/client-order-source-emails";
import { toClientCardOrderItem } from "@/lib/client-card-orders-table";
const ORDERS_PREVIEW = 100;

function firstSearchParam(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export const dynamic = "force-dynamic";

const CLIENT_CARD_ORDERS_INCLUDE = {
  clinic: { select: { id: true, name: true } },
} as const;

type PageProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function profileInitialFromDoctor(doctor: {
  fullName: string;
  lastName: string | null;
  firstName: string | null;
  patronymic: string | null;
  formerLastName: string | null;
  specialty: string | null;
  city: string | null;
  email: string | null;
  clinicWorkEmail: string | null;
  phone: string | null;
  preferredContact: string | null;
  telegramUsername: string | null;
  birthday: Date | null;
  particulars: string | null;
  acceptsPrivatePractice: boolean;
  orderPriceListKind: "MAIN" | "CUSTOM" | null;
  isIpEntrepreneur: boolean;
}): DoctorProfileFormState {
  return {
    fullName: doctor.fullName,
    lastName: doctor.lastName ?? "",
    firstName: doctor.firstName ?? "",
    patronymic: doctor.patronymic ?? "",
    formerLastName: doctor.formerLastName ?? "",
    specialty: doctor.specialty ?? "",
    city: doctor.city ?? "",
    email: doctor.email ?? "",
    clinicWorkEmail: doctor.clinicWorkEmail ?? "",
    phone: doctor.phone ?? "",
    preferredContact: doctor.preferredContact ?? "",
    telegramUsername: doctor.telegramUsername ?? "",
    birthday: doctor.birthday
      ? doctor.birthday.toISOString().slice(0, 10)
      : "",
    particulars: doctor.particulars ?? "",
    acceptsPrivatePractice: doctor.acceptsPrivatePractice,
    orderPriceListKind:
      doctor.orderPriceListKind === "MAIN" ||
      doctor.orderPriceListKind === "CUSTOM"
        ? doctor.orderPriceListKind
        : "",
    isIpEntrepreneur: doctor.isIpEntrepreneur,
  };
}

export default async function DoctorCardPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = params != null ? await params : null;
  const id = resolvedParams?.id?.trim() ?? "";
  if (!id) notFound();

  const { session, access } = await getSessionWithModuleAccess();
  const canEditClients =
    session?.role === "OWNER" || access?.CLIENTS_EDIT === true;

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
        : "overview";

  const defaultMonth = defaultFinanceMonthRangeUTC();
  const fromQ = firstSearchParam(query.from);
  const toQ = firstSearchParam(query.to);
  const financeFrom =
    fromQ && /^\d{4}-\d{2}-\d{2}$/.test(fromQ) ? fromQ : defaultMonth.from;
  const financeTo =
    toQ && /^\d{4}-\d{2}-\d{2}$/.test(toQ) ? toQ : defaultMonth.to;
  const financeRange = parseDateRangeUTC(financeFrom, financeTo);

  let doctor;
  try {
    doctor = await (await getPrisma()).doctor.findUnique({
      where: { id },
      include: {
        ipClinicAsSource: {
          select: {
            id: true,
            name: true,
            address: true,
            legalFullName: true,
            legalAddress: true,
            inn: true,
            kpp: true,
            ogrn: true,
            bankName: true,
            bik: true,
            settlementAccount: true,
            correspondentAccount: true,
            phone: true,
            email: true,
            ceoName: true,
            deletedAt: true,
            billingLegalForm: true,
            orderPriceListKind: true,
            worksWithReconciliation: true,
            reconciliationFrequency: true,
            contractSigned: true,
            contractNumber: true,
            contractDoc: { select: { updatedAt: true } },
            worksWithEdo: true,
            usesPaperDocs: true,
          },
        },
        clinicLinks: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
                address: true,
                deletedAt: true,
              },
            },
          },
          orderBy: { clinic: { name: "asc" } },
        },
        _count: {
          select: { orders: { where: { archivedAt: null } } },
        },
        orders: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: ORDERS_PREVIEW,
          include: CLIENT_CARD_ORDERS_INCLUDE,
        },
        telegramGroups: {
          orderBy: { createdAt: "asc" },
          select: { id: true, telegramChatId: true, label: true },
        },
      },
    });
  } catch (e) {
    console.error("[doctor card] prisma", e);
    return (
      <ModuleFrame title="Врач" description="">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-medium">Ошибка базы данных</p>
          <p className="mt-2">
            Выполните{" "}
            <code className="rounded bg-amber-100 px-1">npx prisma db push</code>
          </p>
          <ClientsBackLink
            returnToFromQuery={returnToFromList}
            fallback="/clients?view=doctor"
            className="mt-4 inline-block text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            ← К списку врачей
          </ClientsBackLink>
        </div>
      </ModuleFrame>
    );
  }

  if (!doctor) notFound();

  const orderSourceEmails = await listDoctorOrderSourceEmails(
    await getPrisma(),
    doctor.tenantId,
    id,
  );

  if (doctor.deletedAt) {
    return (
      <ModuleFrame
        title={doctor.fullName}
        description="Запись удалена из списков."
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ClientsBackLink
            returnToFromQuery={returnToFromList}
            fallback="/clients?view=doctor"
            className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            ← Все врачи
          </ClientsBackLink>
        </div>
        <ContractorDeletedNotice
          variant="doctor"
          id={id}
          title={doctor.fullName}
          deletedAtIso={doctor.deletedAt.toISOString()}
        />
      </ModuleFrame>
    );
  }

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
      sumDoctorConstructionTotals(id),
      sumDoctorConstructionTotals(id, financeRange),
    ]);
  }

  const totalOrders = doctor._count.orders;
  const clientCardOrders = doctor.orders.map((o) => toClientCardOrderItem(o));

  const frameDescription =
    activeTab === "requisites"
      ? "Контакты и настройки врача в CRM."
      : activeTab === "finance"
        ? "Оборот по позициям нарядов врача и выгрузка сверки."
        : "Карточка врача: обзор, клиники и история заказов.";

  return (
    <ModuleFrame
      title={doctor.fullName}
      description={frameDescription}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ClientsBackLink
          returnToFromQuery={returnToFromList}
          fallback="/clients?view=doctor"
          className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          ← Все врачи
        </ClientsBackLink>
      </div>

      <ClientCardTabs
        basePath={`/clients/doctors/${id}`}
        active={activeTab}
      />

      {activeTab === "requisites" ? (
        <div className="space-y-8">
          <DoctorProfilePanel
            doctorId={id}
            canEditClients={canEditClients}
            initial={profileInitialFromDoctor(doctor)}
            telegramGroups={doctor.telegramGroups}
          />
          {doctor.isIpEntrepreneur &&
          doctor.ipClinicAsSource &&
          !doctor.ipClinicAsSource.deletedAt ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  ИП в справочнике клиник
                </h2>
                <Link
                  href={`/clients/${doctor.ipClinicAsSource.id}`}
                  className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
                >
                  Открыть как клинику →
                </Link>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Реквизиты, договор, сверка и ЭДО — те же поля, что в карточке
                клиники. В наряде при «частной практике» и «ИП» в блоке «Финансы»
                к этой записи привязывается заказ.
              </p>
              <RequisitesPanel
                clinicId={doctor.ipClinicAsSource.id}
                canEditClients={canEditClients}
                initial={requisitesFormStateFromClinic(
                  doctor.ipClinicAsSource,
                )}
              />
              <ClinicCommercialTermsPanel
                clinicId={doctor.ipClinicAsSource.id}
                canEditClients={canEditClients}
                initial={{
                  billingLegalForm:
                    doctor.ipClinicAsSource.billingLegalForm === "IP" ||
                    doctor.ipClinicAsSource.billingLegalForm === "OOO"
                      ? doctor.ipClinicAsSource.billingLegalForm
                      : "IP",
                  orderPriceListKind:
                    doctor.ipClinicAsSource.orderPriceListKind === "MAIN" ||
                    doctor.ipClinicAsSource.orderPriceListKind === "CUSTOM"
                      ? doctor.ipClinicAsSource.orderPriceListKind
                      : "",
                  worksWithReconciliation:
                    doctor.ipClinicAsSource.worksWithReconciliation,
                  reconciliationFrequency:
                    doctor.ipClinicAsSource.reconciliationFrequency ===
                      "MONTHLY_1" ||
                    doctor.ipClinicAsSource.reconciliationFrequency ===
                      "MONTHLY_2"
                      ? doctor.ipClinicAsSource.reconciliationFrequency
                      : "",
                  contractSigned: doctor.ipClinicAsSource.contractSigned,
                  contractNumber: doctor.ipClinicAsSource.contractNumber ?? "",
                  hasContractDoc: doctor.ipClinicAsSource.contractDoc != null,
                  worksWithEdo: doctor.ipClinicAsSource.worksWithEdo,
                  usesPaperDocs: doctor.ipClinicAsSource.usesPaperDocs,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "finance" && financeRange ? (
        <DoctorFinancePanel
          doctorId={id}
          canEditClients={canEditClients}
          allTimeTotalRub={allTimeFinance.totalRub}
          allTimeLineCount={allTimeFinance.lineCount}
          allTimeWithoutPrice={allTimeFinance.linesWithoutPrice}
          periodFrom={financeFrom}
          periodTo={financeTo}
          periodTotalRub={periodFinance.totalRub}
          periodLineCount={periodFinance.lineCount}
          periodWithoutPrice={periodFinance.linesWithoutPrice}
        />
      ) : null}

      {activeTab === "finance" && !financeRange ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          Некорректный период. Откройте вкладку «Финансы» снова или задайте даты
          в формате ГГГГ-ММ-ДД.
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm lg:col-span-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Контакты
                </h2>
                {canEditClients ? (
                  <Link
                    href={`/clients/doctors/${id}?tab=requisites`}
                    scroll={false}
                    className="rounded-full bg-[var(--sidebar-blue)] px-3 py-1 text-xs font-semibold text-white hover:opacity-95 sm:text-sm"
                  >
                    Изменить
                  </Link>
                ) : null}
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--text-muted)]">Фамилия</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {displayOrDash(doctor.lastName)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Имя / отчество</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {[doctor.firstName, doctor.patronymic]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Фамилия ранее</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {displayOrDash(doctor.formerLastName)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Специальность</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {displayOrDash(doctor.specialty)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Город</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {displayOrDash(doctor.city)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">E-mail</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {displayOrDash(doctor.email)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Почта клиники (наряды)</dt>
                  <dd className="mt-0.5 break-all text-[var(--app-text)]">
                    {displayOrDash(doctor.clinicWorkEmail)}
                  </dd>
                </div>
                <ClientOrderSourceEmailsField emails={orderSourceEmails} />
                <div>
                  <dt className="text-[var(--text-muted)]">Телефон</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {displayOrDash(doctor.phone)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Предпочтительная связь</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {displayOrDash(doctor.preferredContact)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Telegram</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {doctor.telegramUsername != null &&
                    String(doctor.telegramUsername).trim()
                      ? `@${String(doctor.telegramUsername).replace(/^@+/, "")}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">День рождения</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {doctor.birthday
                      ? doctor.birthday.toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">В базе с</dt>
                  <dd className="mt-0.5 text-[var(--text-strong)]">
                    {doctor.createdAt.toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="flex gap-6 pt-1">
                  <div>
                    <dt className="text-[var(--text-muted)]">Клиник</dt>
                    <dd className="text-lg font-semibold tabular-nums text-[var(--app-text)]">
                      <DoctorLinkedClinicsCount
                        doctorId={id}
                        initial={
                          doctor.clinicLinks.filter(
                            (l) => l.clinic.deletedAt == null,
                          ).length
                        }
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Заказов</dt>
                    <dd className="text-lg font-semibold tabular-nums text-[var(--app-text)]">
                      {doctor._count.orders}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Частная практика</dt>
                  <dd className="mt-0.5 text-[var(--app-text)]">
                    {doctor.acceptsPrivatePractice
                      ? "Да — можно оформлять наряд без клиники"
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <DoctorLinkedClinicsSection
              doctorId={id}
              canEditClients={canEditClients}
              initialLinks={doctor.clinicLinks}
            />
          </div>

          <ClientCardOrdersTable
            variant="doctor"
            orders={clientCardOrders}
            totalOrders={totalOrders}
            emptyMessage="По этому врачу заказов ещё нет."
          />
        </>
      ) : null}
    </ModuleFrame>
  );
}
