"use client";

import Link from "next/link";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { canSeeOrderNotificationKind } from "@/lib/auth/permissions";
import {
  humanListTagLabel,
  LIST_TAG_KAITEN_LAB_MENTION,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PROSTHETICS_PENDING,
  type ParsedListTag,
} from "@/lib/order-list-tag-filter";
import { shipmentsListHref } from "@/lib/shipments-list-query";

export function ShipmentsQuickFilterChips({
  attentionCount,
  prostheticsPendingCount,
  labMentionCount,
  activeFilter = null,
  tab,
  periodFrom,
  periodTo,
}: {
  attentionCount: number;
  prostheticsPendingCount: number;
  labMentionCount: number;
  activeFilter?: ParsedListTag | null;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
}) {
  const { user } = useSessionUser();
  const canCorrections = canSeeOrderNotificationKind(
    "corrections",
    user?.role,
    user?.moduleAccess,
  );
  const canProsthetics = canSeeOrderNotificationKind(
    "prosthetics",
    user?.role,
    user?.moduleAccess,
  );
  const canAdmin = canSeeOrderNotificationKind(
    "admin",
    user?.role,
    user?.moduleAccess,
  );

  const listCtx = {
    tab,
    from: periodFrom,
    to: periodTo,
  };

  const showCorrections =
    canCorrections &&
    (attentionCount > 0 || activeFilter?.kind === "orderAttention");
  const showProsthetics =
    canProsthetics &&
    (prostheticsPendingCount > 0 ||
      activeFilter?.kind === "prostheticsPending");
  const showChat =
    canAdmin &&
    (labMentionCount > 0 || activeFilter?.kind === "kaitenLabMention");

  if (!showCorrections && !showProsthetics && !showChat) return null;

  return (
    <div className="no-print w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <div className="flex flex-wrap items-center gap-2">
        {showCorrections ? (
          <Link
            href={shipmentsListHref({
              ...listCtx,
              tag: LIST_TAG_ORDER_ATTENTION,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "orderAttention"
                ? "border-amber-400/90 bg-amber-100 text-amber-950 ring-2 ring-amber-500/85 dark:border-amber-700 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-500/70"
                : "border-amber-300/70 bg-amber-100/70 text-amber-950 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100 dark:hover:bg-amber-950/50"
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
        {showProsthetics ? (
          <Link
            href={shipmentsListHref({
              ...listCtx,
              tag: LIST_TAG_PROSTHETICS_PENDING,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
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
        {showChat ? (
          <Link
            href={shipmentsListHref({
              ...listCtx,
              tag: LIST_TAG_KAITEN_LAB_MENTION,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "kaitenLabMention"
                ? "border-violet-400/90 bg-violet-100 text-violet-950 ring-2 ring-violet-500/85 dark:border-violet-700 dark:bg-violet-950/45 dark:text-violet-100 dark:ring-violet-500/70"
                : "border-violet-300/70 bg-violet-100/70 text-violet-950 hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-950/35 dark:text-violet-100 dark:hover:bg-violet-950/50"
            }`}
            title={humanListTagLabel(LIST_TAG_KAITEN_LAB_MENTION)}
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              Чат
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {labMentionCount}
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
