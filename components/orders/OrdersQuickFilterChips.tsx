"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  humanListTagLabel,
  LIST_TAG_KAITEN_BLOCKED,
  LIST_TAG_KAITEN_LAB_MENTION,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PROSTHETICS_PENDING,
  LIST_TAG_WAIT_PAYMENT,
  listTagParamsEqual,
  parseListTagParam,
  relatedOrdersListTagQuickFilters,
  type ParsedListTag,
} from "@/lib/order-list-tag-filter";
import { ordersListHref } from "@/lib/orders-list-query";

type ListHrefCommon = {
  tag?: string;
  hideShipped?: boolean;
  onlyShipped?: boolean;
  q?: string;
  from?: string;
  to?: string;
  ship?: "actual" | "period";
  shipFrom?: string;
  shipTo?: string;
  otprFrom?: string;
  otprTo?: string;
  keep?: string;
};

/**
 * Пилюли быстрого фильтра списка заказов.
 * Подсветка активной — сразу по клику (не ждём RSC), навигация в transition.
 */
export function OrdersQuickFilterChips({
  pageSize,
  listHrefCommon,
  attentionCount,
  prostheticsPendingCount,
  waitPaymentCount,
  blockedCount,
  labMentionCount,
  showCorrectionsChip,
  showProstheticsChip,
  showWaitPaymentChip,
  showAdminChip,
  kaitenColumnAlternates = [],
  urgentCoefficientsInDb = [],
  searchSlot,
}: {
  pageSize: number;
  listHrefCommon: ListHrefCommon;
  attentionCount: number;
  prostheticsPendingCount: number;
  waitPaymentCount: number;
  blockedCount: number;
  labMentionCount: number;
  showCorrectionsChip: boolean;
  showProstheticsChip: boolean;
  showWaitPaymentChip: boolean;
  showAdminChip: boolean;
  kaitenColumnAlternates?: string[];
  urgentCoefficientsInDb?: number[];
  searchSlot: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTag = searchParams.get("tag")?.trim() || null;
  const [optimisticTag, setOptimisticTag] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOptimisticTag(null);
  }, [urlTag]);

  const displayTag =
    optimisticTag !== null
      ? optimisticTag.trim()
        ? optimisticTag.trim()
        : null
      : urlTag;
  const activeFilter: ParsedListTag | null = displayTag
    ? parseListTagParam(displayTag)
    : null;

  const hrefCommonWithoutTag: ListHrefCommon = {
    ...listHrefCommon,
    tag: undefined,
  };

  function go(href: string, nextTag: string | null) {
    setOptimisticTag(nextTag ?? "");
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  const pillBase =
    "group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors";

  return (
    <div
      className={`flex w-full min-w-0 flex-wrap items-center gap-2 ${
        isPending ? "opacity-90" : ""
      }`}
      aria-busy={isPending || undefined}
    >
      {searchSlot}
      {showCorrectionsChip ? (
        <Link
          href={ordersListHref({
            limit: pageSize,
            ...hrefCommonWithoutTag,
            tag: LIST_TAG_ORDER_ATTENTION,
          })}
          scroll={false}
          prefetch
          onClick={(e) => {
            e.preventDefault();
            go(
              ordersListHref({
                limit: pageSize,
                ...hrefCommonWithoutTag,
                tag: LIST_TAG_ORDER_ATTENTION,
              }),
              LIST_TAG_ORDER_ATTENTION,
            );
          }}
          className={`${pillBase} ${
            activeFilter?.kind === "orderAttention"
              ? "border-amber-500 bg-amber-400 text-amber-950 ring-2 ring-amber-400/90 dark:border-amber-400 dark:bg-amber-500 dark:text-amber-950 dark:ring-amber-400/80"
              : "border-amber-400/80 bg-amber-300/90 text-amber-950 hover:bg-amber-300 dark:border-amber-500/70 dark:bg-amber-600/55 dark:text-amber-50 dark:hover:bg-amber-600/70"
          }`}
          title="Наряды с непринятыми корректировками из чата («!!!»); в списке также может попасть расхождение суммы счёта с составом"
        >
          <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
            Корректировки
          </span>
          <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
            {attentionCount}
          </span>
        </Link>
      ) : null}
      {showProstheticsChip ? (
        <Link
          href={ordersListHref({
            limit: pageSize,
            ...hrefCommonWithoutTag,
            tag: LIST_TAG_PROSTHETICS_PENDING,
          })}
          scroll={false}
          prefetch
          onClick={(e) => {
            e.preventDefault();
            go(
              ordersListHref({
                limit: pageSize,
                ...hrefCommonWithoutTag,
                tag: LIST_TAG_PROSTHETICS_PENDING,
              }),
              LIST_TAG_PROSTHETICS_PENDING,
            );
          }}
          className={`${pillBase} ${
            activeFilter?.kind === "prostheticsPending"
              ? "border-sky-400/90 bg-sky-100 text-sky-950 ring-2 ring-sky-500/85 dark:border-sky-700 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-500/70"
              : "border-sky-300/70 bg-sky-100/70 text-sky-950 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/35 dark:text-sky-100 dark:hover:bg-sky-950/50"
          }`}
          title="Быстрый фильтр по тегу «Заказ протетики»"
        >
          <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
            Заказ протетики
          </span>
          <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
            {prostheticsPendingCount}
          </span>
        </Link>
      ) : null}
      {showWaitPaymentChip ? (
        <Link
          href={ordersListHref({
            limit: pageSize,
            ...hrefCommonWithoutTag,
            tag: LIST_TAG_WAIT_PAYMENT,
          })}
          scroll={false}
          prefetch
          onClick={(e) => {
            e.preventDefault();
            go(
              ordersListHref({
                limit: pageSize,
                ...hrefCommonWithoutTag,
                tag: LIST_TAG_WAIT_PAYMENT,
              }),
              LIST_TAG_WAIT_PAYMENT,
            );
          }}
          className={`${pillBase} ${
            activeFilter?.kind === "waitPayment"
              ? "border-rose-400/90 bg-rose-100 text-rose-950 ring-2 ring-rose-500/85 dark:border-rose-700 dark:bg-rose-950/45 dark:text-rose-100 dark:ring-rose-500/70"
              : "border-rose-300/70 bg-rose-100/70 text-rose-950 hover:bg-rose-100 dark:border-rose-800/60 dark:bg-rose-950/35 dark:text-rose-100 dark:hover:bg-rose-950/50"
          }`}
          title="Наряды с отметкой «ждем оплату»"
        >
          <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
            Ждем оплату
          </span>
          <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
            {waitPaymentCount}
          </span>
        </Link>
      ) : null}
      <Link
        href={ordersListHref({
          limit: pageSize,
          ...hrefCommonWithoutTag,
          tag: LIST_TAG_KAITEN_BLOCKED,
        })}
        scroll={false}
        prefetch
        onClick={(e) => {
          e.preventDefault();
          go(
            ordersListHref({
              limit: pageSize,
              ...hrefCommonWithoutTag,
              tag: LIST_TAG_KAITEN_BLOCKED,
            }),
            LIST_TAG_KAITEN_BLOCKED,
          );
        }}
        className={`${pillBase} ${
          activeFilter?.kind === "kaitenBlocked"
            ? "border-red-500 bg-red-500 text-white ring-2 ring-red-400/90 dark:border-red-400 dark:bg-red-600 dark:text-red-50 dark:ring-red-400/80"
            : "border-red-400/80 bg-red-200/90 text-red-950 hover:bg-red-200 dark:border-red-500/70 dark:bg-red-950/50 dark:text-red-100 dark:hover:bg-red-950/70"
        }`}
        title="Наряды с заблокированной карточкой"
      >
        <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
          Заблокировано
        </span>
        <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
          {blockedCount}
        </span>
      </Link>
      {showAdminChip ? (
        <Link
          href={ordersListHref({
            limit: pageSize,
            ...hrefCommonWithoutTag,
            tag: LIST_TAG_KAITEN_LAB_MENTION,
          })}
          scroll={false}
          prefetch
          onClick={(e) => {
            e.preventDefault();
            go(
              ordersListHref({
                limit: pageSize,
                ...hrefCommonWithoutTag,
                tag: LIST_TAG_KAITEN_LAB_MENTION,
              }),
              LIST_TAG_KAITEN_LAB_MENTION,
            );
          }}
          className={`${pillBase} ${
            activeFilter?.kind === "kaitenLabMention"
              ? "border-violet-400/90 bg-violet-100 text-violet-950 ring-2 ring-violet-500/90 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-100 dark:ring-violet-500/75"
              : "border-violet-300/70 bg-violet-100/70 text-violet-950 hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-950/35 dark:text-violet-100 dark:hover:bg-violet-950/50"
          }`}
          title="Наряды с непрочитанным упоминанием лаборатории в чате Kaiten (@…)"
        >
          <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
            Упоминания
          </span>
          <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
            {labMentionCount}
          </span>
        </Link>
      ) : null}
      {activeFilter ? (
        <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-md border border-sky-200/80 bg-sky-50/80 px-2 py-1 text-sm dark:border-sky-900/50 dark:bg-sky-950/25">
          <span className="min-w-0 truncate whitespace-nowrap text-[var(--text-body)]">
            Фильтр по тегу:{" "}
            <strong className="text-[var(--text-strong)]">
              {humanListTagLabel(activeFilter)}
            </strong>
          </span>
          <Link
            href={ordersListHref({
              limit: pageSize,
              ...hrefCommonWithoutTag,
              tag: undefined,
            })}
            scroll={false}
            prefetch
            onClick={(e) => {
              e.preventDefault();
              go(
                ordersListHref({
                  limit: pageSize,
                  ...hrefCommonWithoutTag,
                  tag: undefined,
                }),
                null,
              );
            }}
            className="shrink-0 whitespace-nowrap rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-medium text-[var(--sidebar-blue)] shadow-sm hover:bg-[var(--table-row-hover)]"
          >
            Показать все заказы
          </Link>
        </span>
      ) : null}
      {activeFilter
        ? relatedOrdersListTagQuickFilters(activeFilter, {
            kaitenColumnAlternates,
            urgentCoefficientsInDb,
          }).map((opt) => {
            const optParsed = parseListTagParam(opt.tag);
            const isActive = Boolean(
              optParsed && listTagParamsEqual(activeFilter, optParsed),
            );
            return (
              <Link
                key={opt.tag}
                href={ordersListHref({
                  limit: pageSize,
                  ...hrefCommonWithoutTag,
                  tag: opt.tag,
                })}
                scroll={false}
                prefetch
                onClick={(e) => {
                  e.preventDefault();
                  go(
                    ordersListHref({
                      limit: pageSize,
                      ...hrefCommonWithoutTag,
                      tag: opt.tag,
                    }),
                    opt.tag,
                  );
                }}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm ${
                  isActive
                    ? "border-sky-500 bg-sky-100 text-sky-950 ring-1 ring-sky-500/50 dark:border-sky-600 dark:bg-sky-900/50 dark:text-sky-50"
                    : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)]"
                }`}
              >
                {opt.label}
              </Link>
            );
          })
        : null}
    </div>
  );
}
