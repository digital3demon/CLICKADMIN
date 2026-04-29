import Link from "next/link";
import { after } from "next/server";
import { Suspense } from "react";
import { ClientsAddNewPanel } from "@/components/clients/ClientsAddNewPanel";
import { ClientsClinicSortSelect } from "@/components/clients/ClientsClinicSortSelect";
import { ClientsListSearch } from "@/components/clients/ClientsListSearch";
import {
  buildClientPageLinks,
  ClientsPagination,
} from "@/components/clients/ClientsPagination";
import { ClientsViewTabs } from "@/components/clients/ClientsViewTabs";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { PrismaDataLoadErrorCallout } from "@/components/layout/PrismaDataLoadErrorCallout";
import { clinicReconciliationListCell } from "@/lib/clinic-reconciliation-display";
import { clinicTurnoverTotalsByIds } from "@/lib/clinic-finance";
import { displayOrDash, formatBirthdayRu } from "@/lib/format-display";
import {
  buildClientsListUrl,
  CLIENTS_PAGE_SIZE,
  clinicMatchesSearch,
  clinicOrderSelectValue,
  doctorMatchesSearch,
  normalizeClientsSearchQuery,
  parseClientsListUrlQuery,
  type ClientsListUrlState,
} from "@/lib/clients-list-search";
import { getPrisma } from "@/lib/get-prisma";
import { repairDoctorLinksFromOrders } from "@/lib/repair-clinic-doctor-links";

function firstSearchParam(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function moneyRub(n: number): string {
  const x = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(x);
}

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: PageProps) {
  let query: Record<string, string | string[] | undefined> = {};
  if (searchParams != null) {
    const resolved = await searchParams;
    if (resolved && typeof resolved === "object") query = resolved;
  }

  const listState = parseClientsListUrlQuery(query);
  const clinicSearchRaw = normalizeClientsSearchQuery(
    firstSearchParam(query.clinicQ),
  );
  const doctorSearchRaw = normalizeClientsSearchQuery(
    firstSearchParam(query.doctorQ),
  );

  try {
    const prisma = await getPrisma();
    if (listState.view === "clinic") {
      let clinics = await prisma.clinic.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { orders: true, doctorLinks: true } },
        },
      });

      const clinicsNeedingLinks = clinics.filter(
        (c) => c._count.orders > 0 && c._count.doctorLinks === 0,
      );
      if (clinicsNeedingLinks.length > 0) {
        after(async () => {
          const prismaAfter = await getPrisma();
          await Promise.all(
            clinicsNeedingLinks.map((c) =>
              repairDoctorLinksFromOrders(prismaAfter, c.id).catch((e) => {
                console.error("[clients list] repair doctor links", c.id, e);
              }),
            ),
          );
        });
      }

      const visibleClinics = clinicSearchRaw
        ? clinics.filter((c) => clinicMatchesSearch(c, clinicSearchRaw))
        : clinics;

      let turnoverMap = new Map<string, number>();
      try {
        turnoverMap = await clinicTurnoverTotalsByIds(
          visibleClinics.map((c) => c.id),
        );
      } catch (e) {
        console.error("[clients page] clinicTurnoverTotalsByIds", e);
      }

      const sorted = [...visibleClinics].sort((a, b) => {
        let cmp = 0;
        switch (listState.clinicSort) {
          case "name":
            cmp = a.name.localeCompare(b.name, "ru");
            break;
          case "doctors":
            cmp = a._count.doctorLinks - b._count.doctorLinks;
            break;
          case "orders":
            cmp = a._count.orders - b._count.orders;
            break;
          case "turnover":
            cmp =
              (turnoverMap.get(a.id) ?? 0) - (turnoverMap.get(b.id) ?? 0);
            break;
          default:
            cmp = 0;
        }
        return listState.clinicDir === "asc" ? cmp : -cmp;
      });

      const totalClinicRows = sorted.length;
      const totalClinicPages = Math.max(
        1,
        Math.ceil(totalClinicRows / CLIENTS_PAGE_SIZE),
      );
      const clinicPageEff = Math.min(listState.clinicPage, totalClinicPages);
      const pageClinics = sorted.slice(
        (clinicPageEff - 1) * CLIENTS_PAGE_SIZE,
        clinicPageEff * CLIENTS_PAGE_SIZE,
      );

      const clinicNavState: ClientsListUrlState = {
        ...listState,
        view: "clinic",
        clinicPage: clinicPageEff,
      };

      const prevClinicHref =
        clinicPageEff > 1
          ? buildClientsListUrl({
              ...clinicNavState,
              clinicPage: clinicPageEff - 1,
            })
          : null;
      const nextClinicHref =
        clinicPageEff < totalClinicPages
          ? buildClientsListUrl({
              ...clinicNavState,
              clinicPage: clinicPageEff + 1,
            })
          : null;

      const clinicPageLinks = buildClientPageLinks(
        totalClinicPages,
        clinicPageEff,
        (p) => buildClientsListUrl({ ...clinicNavState, clinicPage: p }),
      );

      return (
        <ModuleFrame title="Клиенты">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <ClientsViewTabs active="clinic" listState={clinicNavState} />
            <Link
              href="/clients/history"
              className="shrink-0 text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
            >
              История и удалённые
            </Link>
          </div>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <Suspense
              fallback={
                <div
                  className="h-10 max-w-md flex-1 rounded-lg bg-[var(--surface-hover)]"
                  aria-hidden
                />
              }
            >
              <ClientsListSearch
                mode="clinic"
                initialValue={clinicSearchRaw}
                placeholder="Поиск: название, ООО/юр. лицо, адрес, e-mail, ИНН…"
                className="min-w-0 flex-1 sm:max-w-md"
              />
            </Suspense>
            <Suspense
              fallback={
                <div
                  className="h-16 w-56 animate-pulse rounded-lg bg-[var(--surface-hover)]"
                  aria-hidden
                />
              }
            >
              <ClientsClinicSortSelect
                initialValue={clinicOrderSelectValue(
                  listState.clinicSort,
                  listState.clinicDir,
                )}
              />
            </Suspense>
            <ClientsAddNewPanel mode="clinic" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  <th className="px-3 py-3">Клиника</th>
                  <th className="px-3 py-3">Юр. лицо</th>
                  <th className="px-3 py-3">Адрес</th>
                  <th className="whitespace-nowrap px-3 py-3" title="Работа по сверке и периодичность">
                    Сверка
                  </th>
                  <th className="px-3 py-3 text-center">Врачей</th>
                  <th className="px-3 py-3 text-center">Заказов</th>
                  <th className="px-3 py-3 text-right">Оборот</th>
                  <th className="px-3 py-3">В базе с</th>
                </tr>
              </thead>
              <tbody>
                {clinics.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]"
                    >
                      <p className="font-medium text-[var(--text-strong)]">
                        Клиник пока нет в базе.
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Можно сразу завести клинику кнопкой «Добавить клинику»
                        над таблицей.
                      </p>
                      <p className="mt-3 mx-auto max-w-xl leading-relaxed">
                        Загрузите контрагентов из Excel из корня проекта:{" "}
                        <code className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs">
                          npm run import:clinics:1
                        </code>{" "}
                        (файл{" "}
                        <code className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs">
                          data/imports/1.xlsx
                        </code>
                        ). Убедитесь, что выполнены{" "}
                        <code className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs">
                          npx prisma db push
                        </code>{" "}
                        и страница обновлена.
                      </p>
                    </td>
                  </tr>
                ) : visibleClinics.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]"
                    >
                      По запросу «{clinicSearchRaw}» клиник не найдено. Измените
                      строку поиска или нажмите «Сбросить».
                    </td>
                  </tr>
                ) : (
                  pageClinics.map((c) => {
                    const recon = clinicReconciliationListCell(
                      c.worksWithReconciliation,
                      c.reconciliationFrequency,
                    );
                    return (
                    <tr
                      key={c.id}
                      className={
                        c.isActive === false
                          ? "border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)]/80"
                          : "border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--table-row-hover)]"
                      }
                    >
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/clients/${c.id}`}
                          className="font-medium text-[var(--sidebar-blue)] hover:underline"
                        >
                          <span className="whitespace-pre-line">{c.name}</span>
                          {c.isActive === false ? (
                            <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                              неактивна
                            </span>
                          ) : null}
                        </Link>
                      </td>
                      <td className="max-w-[min(22rem,32vw)] min-w-0 px-3 py-2.5 text-[var(--text-body)]">
                        <span
                          className="line-clamp-2 whitespace-pre-line break-words"
                          title={c.legalFullName?.trim() || undefined}
                        >
                          {displayOrDash(c.legalFullName)}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-3 py-2.5 text-[var(--text-body)]">
                        {c.address ? (
                          <span className="line-clamp-3 whitespace-pre-line">
                            {c.address}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className="max-w-[10rem] whitespace-normal px-3 py-2.5 text-sm text-[var(--text-body)]"
                        title={recon.title}
                      >
                        {recon.text}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-[var(--text-strong)]">
                        {c._count.doctorLinks}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-[var(--text-strong)]">
                        {c._count.orders}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-[var(--text-strong)]">
                        {moneyRub(turnoverMap.get(c.id) ?? 0)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">
                        {c.createdAt.toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <ClientsPagination
            totalItems={totalClinicRows}
            pageSize={CLIENTS_PAGE_SIZE}
            currentPage={clinicPageEff}
            totalPages={totalClinicPages}
            prevHref={prevClinicHref}
            nextHref={nextClinicHref}
            pageLinks={clinicPageLinks}
          />
        </ModuleFrame>
      );
    }

    const doctors = await prisma.doctor.findMany({
      where: { deletedAt: null },
      orderBy: { fullName: "asc" },
      include: {
        clinicLinks: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
                deletedAt: true,
                legalFullName: true,
                billingLegalForm: true,
              },
            },
          },
          orderBy: { clinic: { name: "asc" } },
        },
      },
    });

    const visibleDoctors = doctorSearchRaw
      ? doctors.filter((d) => doctorMatchesSearch(d, doctorSearchRaw))
      : doctors;

    const totalDoctorRows = visibleDoctors.length;
    const totalDoctorPages = Math.max(
      1,
      Math.ceil(totalDoctorRows / CLIENTS_PAGE_SIZE),
    );
    const doctorPageEff = Math.min(listState.doctorPage, totalDoctorPages);
    const pageDoctors = visibleDoctors.slice(
      (doctorPageEff - 1) * CLIENTS_PAGE_SIZE,
      doctorPageEff * CLIENTS_PAGE_SIZE,
    );

    const doctorNavState: ClientsListUrlState = {
      ...listState,
      view: "doctor",
      doctorPage: doctorPageEff,
    };

    const prevDoctorHref =
      doctorPageEff > 1
        ? buildClientsListUrl({
            ...doctorNavState,
            doctorPage: doctorPageEff - 1,
          })
        : null;
    const nextDoctorHref =
      doctorPageEff < totalDoctorPages
        ? buildClientsListUrl({
            ...doctorNavState,
            doctorPage: doctorPageEff + 1,
          })
        : null;

    const doctorPageLinks = buildClientPageLinks(
      totalDoctorPages,
      doctorPageEff,
      (p) => buildClientsListUrl({ ...doctorNavState, doctorPage: p }),
    );

    return (
      <ModuleFrame title="Клиенты">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <ClientsViewTabs active="doctor" listState={doctorNavState} />
          <Link
            href="/clients/history"
            className="shrink-0 text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            История и удалённые
          </Link>
        </div>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <Suspense
            fallback={
              <div
                className="h-10 max-w-md flex-1 rounded-lg bg-[var(--surface-hover)]"
                aria-hidden
              />
            }
          >
            <ClientsListSearch
              mode="doctor"
              initialValue={doctorSearchRaw}
              placeholder="Поиск: ФИО, телефон, Telegram, клиники, заметки…"
              className="min-w-0 flex-1 sm:max-w-md"
            />
          </Suspense>
          <ClientsAddNewPanel mode="doctor" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                <th className="px-3 py-3">Врач</th>
                <th className="px-3 py-3">Телефон</th>
                <th className="px-3 py-3">Связь</th>
                <th className="px-3 py-3">Telegram</th>
                <th className="px-3 py-3">День рождения</th>
                <th className="px-3 py-3">Особенности</th>
                <th className="px-3 py-3">Клиники</th>
                <th className="px-3 py-3 text-center">Частное лицо</th>
              </tr>
            </thead>
            <tbody>
              {doctors.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-[var(--text-muted)]"
                  >
                    Врачей пока нет. Нажмите «Добавить врача» над таблицей,
                    импорт, seed или заведите из наряда.
                  </td>
                </tr>
              ) : visibleDoctors.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]"
                  >
                    По запросу «{doctorSearchRaw}» врачей не найдено. Измените
                    строку поиска или нажмите «Сбросить».
                  </td>
                </tr>
              ) : (
                pageDoctors.map((d) => {
                  const activeClinicLinks = d.clinicLinks.filter(
                    (l) => l.clinic.deletedAt == null,
                  );
                  const clinicsLabel =
                    activeClinicLinks.length === 0
                      ? "—"
                      : activeClinicLinks.map((l) => l.clinic.name).join(", ");
                  const tg =
                    d.telegramUsername != null &&
                    String(d.telegramUsername).trim()
                      ? `@${String(d.telegramUsername).replace(/^@+/, "")}`
                      : null;
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--table-row-hover)]"
                    >
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/clients/doctors/${d.id}`}
                          className="font-medium text-[var(--sidebar-blue)] hover:underline"
                        >
                          {d.fullName}
                        </Link>
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2.5 text-[var(--text-strong)]">
                        {displayOrDash(d.phone)}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2.5 text-[var(--text-strong)]">
                        {displayOrDash(d.preferredContact)}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2.5 text-[var(--text-strong)]">
                        {displayOrDash(tg)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-body)]">
                        {formatBirthdayRu(d.birthday)}
                      </td>
                      <td
                        className="max-w-[200px] truncate px-3 py-2.5 text-[var(--text-body)]"
                        title={d.particulars ?? ""}
                      >
                        {displayOrDash(d.particulars)}
                      </td>
                      <td className="max-w-[240px] px-3 py-2.5 text-[var(--text-body)]">
                        <span className="line-clamp-2 whitespace-pre-line">
                          {clinicsLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-[var(--text-strong)]">
                        {d.acceptsPrivatePractice ? "Да" : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ClientsPagination
          totalItems={totalDoctorRows}
          pageSize={CLIENTS_PAGE_SIZE}
          currentPage={doctorPageEff}
          totalPages={totalDoctorPages}
          prevHref={prevDoctorHref}
          nextHref={nextDoctorHref}
          pageLinks={doctorPageLinks}
        />
      </ModuleFrame>
    );
  } catch (e) {
    console.error("[clients page] prisma", e);
    return (
      <ModuleFrame title="Клиенты" description="">
        <PrismaDataLoadErrorCallout
          title="Не удалось загрузить данные"
          intro="Чаще всего схема БД и сгенерированный клиент Prisma не совпали после обновления."
          error={e}
        />
      </ModuleFrame>
    );
  }
}
