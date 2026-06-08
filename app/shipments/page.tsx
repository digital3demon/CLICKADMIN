import { ShipmentsOrdersTable } from "@/components/shipments/ShipmentsOrdersTable";
import { ShipmentsPeriodForm } from "@/components/shipments/ShipmentsPeriodForm";
import {
  ShipmentsTabNav,
  type ShipmentsTab,
} from "@/components/shipments/ShipmentsTabNav";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import Link from "next/link";
import { fetchShipmentOrdersInDueRange } from "@/lib/fetch-shipments-orders";
import {
  humanListTagLabel,
  parseListTagParam,
  type ParsedListTag,
} from "@/lib/order-list-tag-filter";
import {
  addCalendarDaysYmd,
  moscowShipmentDayBoundsUtc,
  moscowShipmentInclusiveRangeBoundsUtc,
  moscowTodayYmd,
  moscowTomorrowYmd,
  parseYmdOrNull,
} from "@/lib/shipments-date-range";
import { shipmentsListHref, shipmentsStickersPrintHref } from "@/lib/shipments-list-query";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSiteOrigin } from "@/lib/site-origin-server";
import { getLabDueHmSlotsForTenant } from "@/lib/get-lab-due-hm-slots-for-tenant";
export const dynamic = "force-dynamic";

/** На всю ширину рабочей области — как список «Заказы». */
const SHIPMENTS_LIST_STACK = "w-full max-w-full min-w-0 self-start space-y-4";

const MAX_RANGE_DAYS = 366;

function parseTab(raw: string | undefined): ShipmentsTab {
  if (raw === "tomorrow" || raw === "period" || raw === "today") return raw;
  return "today";
}

function rangeDaySpan(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function shipmentsTagFilterCallout(props: {
  rawTagInvalid: boolean;
  active: ParsedListTag | null;
  clearHref: string;
}) {
  if (props.rawTagInvalid) {
    return (
      <p className="no-print w-full rounded-md border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
        Параметр <code className="font-mono">tag</code> в ссылке не распознан — фильтр не
        применён, показан полный список отгрузки.
      </p>
    );
  }
  if (!props.active) return null;
  return (
    <div className="no-print flex w-full flex-wrap items-center gap-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-sm dark:border-sky-900/50 dark:bg-sky-950/25 sm:px-4 sm:py-2.5 sm:text-base">
      <span className="text-[var(--text-body)]">
        Фильтр по отметке:{" "}
        <strong className="text-[var(--text-strong)]">
          {humanListTagLabel(props.active)}
        </strong>
      </span>
      <Link
        href={props.clearHref}
        className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--sidebar-blue)] shadow-sm hover:bg-[var(--table-row-hover)]"
      >
        Показать все отгрузки
      </Link>
    </div>
  );
}

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const rawTag =
    typeof sp.tag === "string" && String(sp.tag).trim()
      ? String(sp.tag).trim()
      : null;
  const activeListTagFilter = rawTag ? parseListTagParam(rawTag) : null;
  const rawTagInvalid = Boolean(rawTag && !activeListTagFilter);
  const listTagForFetch = rawTagInvalid || !rawTag ? null : rawTag;
  const tagForNav = rawTagInvalid ? null : rawTag;
  const prisma = await getOrdersPrisma();
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  const isDemo = Boolean(session?.demo);
  const siteOrigin = await getSiteOrigin();
  const tab = parseTab(sp.tab);

  if (!tenantId) {
    return (
      <ModuleFrame title="Отгрузки" description="">
        <p className="text-sm text-[var(--text-secondary)]">
          Войдите в CRM, чтобы просматривать отгрузки.
        </p>
      </ModuleFrame>
    );
  }

  const labDueHmSlots = await getLabDueHmSlotsForTenant(tenantId);

  const showAccountantShipmentColumns = session?.role === "ACCOUNTANT";

  const todayYmd = moscowTodayYmd();
  const defaultFrom = addCalendarDaysYmd(todayYmd, -7);
  const defaultTo = todayYmd;

  const fromRaw = parseYmdOrNull(sp.from ?? null);
  const toRaw = parseYmdOrNull(sp.to ?? null);

  const description =
    "Наряды по сроку лаборатории (колонка «Лаборатория»), не по записи пациента. Для выбранного дня D (МСК) в список попадают наряды, у которых срок лаборатории попадает в окно D 00:00 — (D+1) 12:00; например, «Сегодня» включает сегодня и завтра до полудня. Таблица как на странице «Заказы»: отметки и колонка Kaiten обновляются в фоне. Пилюли в «Отметках» можно использовать для фильтрации прямо на этой странице.";

  if (tab === "today") {
    const { start, endExclusive } = moscowShipmentDayBoundsUtc(todayYmd);
    const orders = await fetchShipmentOrdersInDueRange(
      prisma,
      tenantId,
      start,
      endExclusive,
      { listTag: listTagForFetch },
    );
    const clearHref = shipmentsListHref({
      tab: "today",
      from: fromRaw ?? undefined,
      to: toRaw ?? undefined,
    });
    return (
      <ModuleFrame
        title="Отгрузки"
        description={description}
        descriptionClassName="no-print max-w-3xl"
      >
        <div className={SHIPMENTS_LIST_STACK}>
          <ShipmentsTabNav
            active="today"
            periodFrom={fromRaw}
            periodTo={toRaw}
            listTag={tagForNav}
          />
          {shipmentsTagFilterCallout({
            rawTagInvalid,
            active: activeListTagFilter,
            clearHref,
          })}
          <ShipmentsOrdersTable
            orders={orders}
            emptyHint="В окне отгрузки на сегодня нет нарядов с указанным сроком лаборатории в этом интервале."
            listHeading={`Срок лаборатории (МСК), окно ${todayYmd} 00:00 — ${addCalendarDaysYmd(todayYmd, 1)} 12:00 · нарядов: ${orders.length}`}
            isDemo={isDemo}
            siteOrigin={siteOrigin}
            labDueHmSlots={labDueHmSlots}
            showAccountantColumns={showAccountantShipmentColumns}
            shipmentsTagFilterContext={{
              tab: "today",
              periodFrom: fromRaw,
              periodTo: toRaw,
            }}
            stickersPrintHref={shipmentsStickersPrintHref({
              tab: "today",
              from: fromRaw,
              to: toRaw,
              tag: tagForNav,
            })}
          />
        </div>
      </ModuleFrame>
    );
  }

  if (tab === "tomorrow") {
    const ymd = moscowTomorrowYmd();
    const { start, endExclusive } = moscowShipmentDayBoundsUtc(ymd);
    const orders = await fetchShipmentOrdersInDueRange(
      prisma,
      tenantId,
      start,
      endExclusive,
      { listTag: listTagForFetch },
    );
    const clearHref = shipmentsListHref({
      tab: "tomorrow",
      from: fromRaw ?? undefined,
      to: toRaw ?? undefined,
    });
    return (
      <ModuleFrame
        title="Отгрузки"
        description={description}
        descriptionClassName="no-print max-w-3xl"
      >
        <div className={SHIPMENTS_LIST_STACK}>
          <ShipmentsTabNav
            active="tomorrow"
            periodFrom={fromRaw}
            periodTo={toRaw}
            listTag={tagForNav}
          />
          {shipmentsTagFilterCallout({
            rawTagInvalid,
            active: activeListTagFilter,
            clearHref,
          })}
          <ShipmentsOrdersTable
            orders={orders}
            emptyHint="В окне отгрузки на завтра нет нарядов с указанным сроком лаборатории в этом интервале."
            listHeading={`Срок лаборатории (МСК), окно ${ymd} 00:00 — ${addCalendarDaysYmd(ymd, 1)} 12:00 · нарядов: ${orders.length}`}
            isDemo={isDemo}
            siteOrigin={siteOrigin}
            labDueHmSlots={labDueHmSlots}
            showAccountantColumns={showAccountantShipmentColumns}
            shipmentsTagFilterContext={{
              tab: "tomorrow",
              periodFrom: fromRaw,
              periodTo: toRaw,
            }}
            stickersPrintHref={shipmentsStickersPrintHref({
              tab: "tomorrow",
              from: fromRaw,
              to: toRaw,
              tag: tagForNav,
            })}
          />
        </div>
      </ModuleFrame>
    );
  }

  let error: string | null = null;
  let orders: Awaited<ReturnType<typeof fetchShipmentOrdersInDueRange>> = [];

  if (fromRaw && toRaw) {
    if (fromRaw > toRaw) {
      error = "Дата «с» не может быть позже даты «по».";
    } else {
      const span = rangeDaySpan(fromRaw, toRaw);
      if (span > MAX_RANGE_DAYS) {
        error = `Максимальный период — ${MAX_RANGE_DAYS} дней. Сузьте диапазон.`;
      } else {
        const { start, endExclusive } = moscowShipmentInclusiveRangeBoundsUtc(
          fromRaw,
          toRaw,
        );
        orders = await fetchShipmentOrdersInDueRange(
          prisma,
          tenantId,
          start,
          endExclusive,
          { listTag: listTagForFetch },
        );
      }
    }
  }

  const paramsPresent = Boolean(fromRaw && toRaw);
  const showTable = paramsPresent && !error;
  const periodClearHref =
    fromRaw && toRaw
      ? shipmentsListHref({
          tab: "period",
          from: fromRaw,
          to: toRaw,
        })
      : shipmentsListHref({ tab: "period" });

  return (
    <ModuleFrame
      title="Отгрузки"
      description={description}
      descriptionClassName="no-print max-w-3xl"
    >
      <div className={SHIPMENTS_LIST_STACK}>
        <ShipmentsTabNav
          active="period"
          periodFrom={fromRaw}
          periodTo={toRaw}
          listTag={tagForNav}
        />

        {shipmentsTagFilterCallout({
          rawTagInvalid,
          active: activeListTagFilter,
          clearHref: periodClearHref,
        })}

        <div className="no-print w-full">
          <ShipmentsPeriodForm
            appliedFrom={fromRaw}
            appliedTo={toRaw}
            defaultFrom={defaultFrom}
            defaultTo={defaultTo}
            preserveListTag={tagForNav}
            receptionSummary={
              showTable
                ? `Срок лаборатории (МСК), окна от ${fromRaw!} до ${addCalendarDaysYmd(toRaw!, 1)} 12:00 · нарядов: ${orders.length}`
                : null
            }
          />
        </div>

        {error ? (
          <p className="no-print w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </p>
        ) : null}

        {!paramsPresent ? (
          <p className="no-print w-full text-sm text-[var(--text-secondary)]">
            Укажите даты и нажмите «Показать», чтобы загрузить список работ к
            отгрузке.
          </p>
        ) : !error ? (
          <p className="no-print w-full text-sm text-[var(--text-secondary)]">
            Период:{" "}
            <span className="font-mono tabular-nums">
              {fromRaw} — {toRaw}
            </span>
            {" · "}
            найдено: {orders.length}
          </p>
        ) : null}

        {showTable ? (
          <ShipmentsOrdersTable
            orders={orders}
            emptyHint="За выбранный период нет нарядов с указанным сроком лаборатории в соответствующих окнах отгрузки."
            listHeading={`Срок лаборатории (МСК), окна от ${fromRaw!} до ${addCalendarDaysYmd(toRaw!, 1)} 12:00 · нарядов: ${orders.length}`}
            listHeadingScreen={false}
            isDemo={isDemo}
            siteOrigin={siteOrigin}
            labDueHmSlots={labDueHmSlots}
            showAccountantColumns={showAccountantShipmentColumns}
            shipmentsTagFilterContext={{
              tab: "period",
              periodFrom: fromRaw,
              periodTo: toRaw,
            }}
            stickersPrintHref={shipmentsStickersPrintHref({
              tab: "period",
              from: fromRaw,
              to: toRaw,
              tag: tagForNav,
            })}
          />
        ) : null}
      </div>
    </ModuleFrame>
  );
}
