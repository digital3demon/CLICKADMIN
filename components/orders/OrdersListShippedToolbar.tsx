import Link from "next/link";
import type { ReactNode } from "react";
import { ordersListHref } from "@/lib/orders-list-query";

type Props = {
  pageSize: number;
  rawTag: string | null;
  listSearchQ: string;
  fromUrl: string | null;
  toUrl: string | null;
  otprFromUrl?: string | null;
  otprToUrl?: string | null;
  ship?: "actual" | "period" | null;
  shipFrom?: string | null;
  shipTo?: string | null;
  onlyShippedActive: boolean;
  hideShippedActive: boolean;
};

const linkNeutral =
  "inline-flex min-w-0 w-full items-center justify-center text-center whitespace-normal rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-medium leading-tight text-[var(--text-body)] shadow-sm hover:bg-[var(--surface-hover)]";
const linkEmerald =
  "inline-flex min-w-0 w-full items-center justify-center text-center whitespace-normal rounded-full border border-emerald-300/70 bg-emerald-100/80 px-2.5 py-1 text-xs font-medium leading-tight text-emerald-950 shadow-sm hover:bg-emerald-200/90 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/55";
const linkSky =
  "inline-flex min-w-0 w-full items-center justify-center text-center whitespace-normal rounded-full border border-sky-300/70 bg-sky-100/80 px-2.5 py-1 text-xs font-medium leading-tight text-sky-950 shadow-sm hover:bg-sky-200/90 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/55";

/** Кнопки фильтра по отгрузке — колонкой справа от «Старт нового месяца». */
export function OrdersListShippedToolbar({
  pageSize,
  rawTag,
  listSearchQ,
  fromUrl,
  toUrl,
  otprFromUrl = null,
  otprToUrl = null,
  ship = null,
  shipFrom = null,
  shipTo = null,
  onlyShippedActive,
  hideShippedActive,
}: Props) {
  const q = listSearchQ || undefined;
  const from = fromUrl ?? undefined;
  const to = toUrl ?? undefined;
  const tag = rawTag ?? undefined;
  const keep = {
    otprFrom: otprFromUrl ?? undefined,
    otprTo: otprToUrl ?? undefined,
    ship: ship ?? undefined,
    shipFrom: shipFrom ?? undefined,
    shipTo: shipTo ?? undefined,
  };

  let links: ReactNode;
  if (onlyShippedActive) {
    links = (
      <>
        <Link
          href={ordersListHref({ limit: pageSize, tag, q, from, to, ...keep })}
          className={linkNeutral}
        >
          Показать все наряды
        </Link>
        <Link
          href={ordersListHref({
            limit: pageSize,
            tag,
            hideShipped: true,
            q,
            from,
            to,
            ...keep,
          })}
          className={linkEmerald}
        >
          Скрыть отгруженные
        </Link>
      </>
    );
  } else if (hideShippedActive) {
    links = (
      <>
        <Link
          href={ordersListHref({ limit: pageSize, tag, q, from, to, ...keep })}
          className={linkNeutral}
        >
          Показать отгруженные
        </Link>
        <Link
          href={ordersListHref({
            limit: pageSize,
            tag,
            onlyShipped: true,
            q,
            from,
            to,
            ...keep,
          })}
          className={linkSky}
        >
          Только отгруженные
        </Link>
      </>
    );
  } else {
    links = (
      <>
        <Link
          href={ordersListHref({
            limit: pageSize,
            tag,
            hideShipped: true,
            q,
            from,
            to,
            ...keep,
          })}
          className={linkEmerald}
        >
          Скрыть отгруженные
        </Link>
        <Link
          href={ordersListHref({
            limit: pageSize,
            tag,
            onlyShipped: true,
            q,
            from,
            to,
            ...keep,
          })}
          className={linkSky}
        >
          Только отгруженные
        </Link>
      </>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-1 crm-t2:max-w-[12.5rem] crm-t3:w-auto crm-t3:shrink-0">
      {links}
    </div>
  );
}
