import { ShipmentsOrdersTable } from "@/components/shipments/ShipmentsOrdersTable";
import { ShipmentsPeriodForm } from "@/components/shipments/ShipmentsPeriodForm";
import {
  ShipmentsTabNav,
  type ShipmentsTab,
} from "@/components/shipments/ShipmentsTabNav";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { fetchShipmentOrdersInDueRange } from "@/lib/fetch-shipments-orders";
import {
  addCalendarDaysYmd,
  moscowShipmentDayBoundsUtc,
  moscowShipmentInclusiveRangeBoundsUtc,
  moscowTodayYmd,
  moscowTomorrowYmd,
  parseYmdOrNull,
} from "@/lib/shipments-date-range";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getPrisma } from "@/lib/get-prisma";
import { getSiteOrigin } from "@/lib/site-origin-server";
export const dynamic = "force-dynamic";

/** Колонка по ширине таблицы, к левому краю — как на странице «Заказы». */
const SHIPMENTS_LIST_STACK = "w-fit max-w-full min-w-0 self-start space-y-4";

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

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const prisma = await getPrisma();
  const session = await getSessionFromCookies();
  const isDemo = Boolean(session?.demo);
  const siteOrigin = await getSiteOrigin();
  const tab = parseTab(sp.tab);

  const todayYmd = moscowTodayYmd();
  const defaultFrom = addCalendarDaysYmd(todayYmd, -7);
  const defaultTo = todayYmd;

  const fromRaw = parseYmdOrNull(sp.from ?? null);
  const toRaw = parseYmdOrNull(sp.to ?? null);

  const description =
    "Наряды по дате приёма пациента. Для выбранного дня D (МСК) в список попадают приёмы с D 00:00 до (D+1) 12:00 — например, «Сегодня» включает сегодня и завтра до полудня. Таблица как на странице «Заказы»: отметки и колонка Kaiten обновляются в фоне.";

  if (tab === "today") {
    const { start, endExclusive } = moscowShipmentDayBoundsUtc(todayYmd);
    const orders = await fetchShipmentOrdersInDueRange(
      prisma,
      start,
      endExclusive,
    );
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
          />
          <ShipmentsOrdersTable
            orders={orders}
            emptyHint="В окне отгрузки на сегодня нет нарядов с указанной датой приёма пациента."
            listHeading={`Приём пациента (МСК), окно ${todayYmd} 00:00 — ${addCalendarDaysYmd(todayYmd, 1)} 12:00 · нарядов: ${orders.length}`}
            isDemo={isDemo}
            siteOrigin={siteOrigin}
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
      start,
      endExclusive,
    );
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
          />
          <ShipmentsOrdersTable
            orders={orders}
            emptyHint="В окне отгрузки на завтра нет нарядов с указанной датой приёма пациента."
            listHeading={`Приём пациента (МСК), окно ${ymd} 00:00 — ${addCalendarDaysYmd(ymd, 1)} 12:00 · нарядов: ${orders.length}`}
            isDemo={isDemo}
            siteOrigin={siteOrigin}
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
          start,
          endExclusive,
        );
      }
    }
  }

  const paramsPresent = Boolean(fromRaw && toRaw);
  const showTable = paramsPresent && !error;

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
        />

        <div className="no-print w-full">
          <ShipmentsPeriodForm
            appliedFrom={fromRaw}
            appliedTo={toRaw}
            defaultFrom={defaultFrom}
            defaultTo={defaultTo}
            receptionSummary={
              showTable
                ? `Приём пациента (МСК), окна от ${fromRaw!} до ${addCalendarDaysYmd(toRaw!, 1)} 12:00 · нарядов: ${orders.length}`
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
            emptyHint="За выбранный период нет нарядов с указанной датой приёма пациента в соответствующих окнах отгрузки."
            listHeading={`Приём пациента (МСК), окна от ${fromRaw!} до ${addCalendarDaysYmd(toRaw!, 1)} 12:00 · нарядов: ${orders.length}`}
            listHeadingScreen={false}
            isDemo={isDemo}
            siteOrigin={siteOrigin}
          />
        ) : null}
      </div>
    </ModuleFrame>
  );
}
