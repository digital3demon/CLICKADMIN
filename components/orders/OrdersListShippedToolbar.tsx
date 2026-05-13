import Link from "next/link";
import { ordersListHref } from "@/lib/orders-list-query";

type Props = {
  pageSize: number;
  rawTag: string | null;
  listSearchQ: string;
  fromUrl: string | null;
  toUrl: string | null;
  onlyShippedActive: boolean;
  hideShippedActive: boolean;
};

const linkNeutral =
  "min-w-0 max-w-full rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-body)] shadow-sm hover:bg-[var(--surface-hover)] sm:px-4 sm:py-2";
const linkEmerald =
  "min-w-0 max-w-full rounded-md border border-emerald-300/70 bg-emerald-100/80 px-3 py-1.5 text-sm font-medium text-emerald-950 shadow-sm hover:bg-emerald-200/90 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/55 sm:px-4 sm:py-2";
const linkSky =
  "min-w-0 max-w-full rounded-md border border-sky-300/70 bg-sky-100/80 px-3 py-1.5 text-sm font-medium text-sky-950 shadow-sm hover:bg-sky-200/90 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/55 sm:px-4 sm:py-2";

/** Кнопки фильтра по отгрузке — в шапке рядом с «Старт нового месяца». */
export function OrdersListShippedToolbar({
  pageSize,
  rawTag,
  listSearchQ,
  fromUrl,
  toUrl,
  onlyShippedActive,
  hideShippedActive,
}: Props) {
  const q = listSearchQ || undefined;
  const from = fromUrl ?? undefined;
  const to = toUrl ?? undefined;
  const tag = rawTag ?? undefined;

  if (onlyShippedActive) {
    return (
      <>
        <Link
          href={ordersListHref({ limit: pageSize, tag, q, from, to })}
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
          })}
          className={linkEmerald}
        >
          Скрыть отгруженные работы
        </Link>
      </>
    );
  }

  if (hideShippedActive) {
    return (
      <>
        <Link
          href={ordersListHref({ limit: pageSize, tag, q, from, to })}
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
          })}
          className={linkSky}
        >
          Показать только отгруженные работы
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href={ordersListHref({
          limit: pageSize,
          tag,
          hideShipped: true,
          q,
          from,
          to,
        })}
        className={linkEmerald}
      >
        Скрыть отгруженные работы
      </Link>
      <Link
        href={ordersListHref({
          limit: pageSize,
          tag,
          onlyShipped: true,
          q,
          from,
          to,
        })}
        className={linkSky}
      >
        Показать только отгруженные работы
      </Link>
    </>
  );
}
