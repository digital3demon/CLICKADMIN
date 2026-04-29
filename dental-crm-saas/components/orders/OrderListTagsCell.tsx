"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  customListTagLabelMeansKaitenBlock,
  type KaitenBlockFromListTagResult,
} from "@/lib/custom-list-tag-kaiten-block-label";
import {
  customListTagLabelMeansKaitenUnblock,
  type KaitenUnblockFromListTagResult,
} from "@/lib/custom-list-tag-kaiten-unblock-label";
import { LAB_WORK_STATUS_PILL_STYLES } from "@/lib/lab-work-status";
import { kaitenStatusDisplay } from "@/lib/kaiten-column-title";
import {
  LIST_TAG_INVOICE,
  LIST_TAG_INVOICE_PRINTED,
  LIST_TAG_KAITEN_BLOCKED,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_OTPR,
  LIST_TAG_PROSTHETICS,
  LIST_TAG_PROSTHETICS_PENDING,
  LIST_TAG_URGENT,
  listTagCustomLabel,
  listTagKaitenColumnTitle,
} from "@/lib/order-list-tag-filter";
import {
  filterQuickOrderTagSuggestions,
  QUICK_TAG_KAITEN_BLOCK_LABEL,
  type QuickOrderTagSuggestion,
} from "@/lib/order-list-quick-tag-suggestions";
import { ordersListHref } from "@/lib/orders-list-query";

type CustomRow = { id: string; label: string };

type Props = {
  orderId: string;
  pageSize: number;
  /** Сохранять в ссылках фильтра `hideShipped` со страницы заказов. */
  hideShipped?: boolean;
  /** Сохранять в ссылках фильтр «только отгруженные» (`onlyShipped`). */
  onlyShipped?: boolean;
  kaitenCardId: number | null;
  /** Демо: колонка внутреннего канбана */
  demoKanbanColumn?: string | null;
  demoCardTypeName?: string | null;
  kaitenColumnTitle: string | null;
  prostheticsOrdered: boolean;
  /** Открытые заявки «???» по протетике (без «Протетика заказана») */
  listPendingProstheticsRequests?: boolean;
  /** Отметка «Счёт распечатан» (как в наряде) */
  invoicePrinted?: boolean;
  /** Загружен файл счёта (вкладка «Документооборот») */
  hasInvoiceAttachment: boolean;
  adminShippedOtpr: boolean;
  /** Карточка Kaiten заблокирована — показываем чип в отметках и фильтр */
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  customTags: CustomRow[];
  /** Сохранять поиск `q` в ссылках фильтра по тегу. */
  listSearchQ?: string | null;
  /** Период по дате создания (URL `from` / `to`). */
  periodFrom?: string | null;
  periodTo?: string | null;
  /** Жёлтый треугольник «!»: непринятые корректировки «!!!» или расхождение счёта с составом. */
  orderAttentionWarning?: boolean;
};

const padTable =
  "px-2 py-0.5 text-[11px] leading-tight sm:px-2.5 sm:py-1 sm:text-xs sm:leading-snug md:text-sm";

/** Облако тегов: перенос по реальной ширине колонки таблицы (`min-w-0` у ячейки). */
const TAG_CLOUD_CLASS =
  "flex min-h-min w-full min-w-0 flex-wrap content-start items-center gap-x-1 gap-y-1.5";

/** Жёлтый треугольник с «!» (как знак внимания), без клика. */
/** Белый контур шестерёнки на «небесной» пилюле — как стек уведомлений по протетике. */
function ProstheticsPendingGearGlyph({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Внешний контур 6-зубой шестерёнки + втулка — только обводка */}
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="#ffffff"
        strokeWidth="2.45"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="#ffffff"
        strokeWidth="2.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrderAttentionWarningGlyph({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 2.35c.42 0 .81.22 1.03.6l8.72 15.1c.43.74-.1 1.68-1.03 1.68H4.28c-.93 0-1.46-.94-1.03-1.68l8.72-15.1c.22-.38.61-.6 1.03-.6z"
        fill="#FACC15"
        stroke="#EAB308"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.85c.12 0 .23.06.3.17l7.55 13.1c.14.24-.03.55-.3.55H4.45c-.27 0-.44-.31-.3-.55l7.55-13.1c.07-.11.18-.17.3-.17z"
        fill="#FDE047"
        stroke="#171717"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.15v4.35"
        stroke="#171717"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.05" r="1.2" fill="#171717" />
    </svg>
  );
}

type TagCloudItem = { key: string; flex: "shrink" | "grow"; node: ReactNode };

function tagHref(
  pageSize: number,
  innerKey: string,
  hideShipped?: boolean,
  onlyShipped?: boolean,
  listSearchQ?: string | null,
  periodFrom?: string | null,
  periodTo?: string | null,
): string {
  return ordersListHref({
    limit: pageSize,
    tag: innerKey,
    hideShipped: hideShipped === true,
    onlyShipped: onlyShipped === true,
    q: listSearchQ?.trim() ? listSearchQ.trim() : undefined,
    from: periodFrom?.trim() || undefined,
    to: periodTo?.trim() || undefined,
  });
}

export function OrderListTagsCell({
  orderId,
  pageSize,
  hideShipped = false,
  onlyShipped = false,
  kaitenCardId,
  demoKanbanColumn,
  demoCardTypeName,
  kaitenColumnTitle,
  prostheticsOrdered,
  listPendingProstheticsRequests = false,
  invoicePrinted = false,
  hasInvoiceAttachment,
  adminShippedOtpr,
  kaitenBlocked,
  kaitenBlockReason,
  isUrgent,
  urgentCoefficient,
  customTags,
  listSearchQ,
  periodFrom,
  periodTo,
  orderAttentionWarning = false,
}: Props) {
  const router = useRouter();
  const kaitenLabel = kaitenStatusDisplay({
    kaitenColumnTitle,
    kaitenCardId,
    demoKanbanColumn,
    demoCardTypeName,
  });
  const kaitenColTrimmed = kaitenColumnTitle?.trim() ?? "";
  const kaitenFilterKey =
    kaitenColTrimmed.length > 0
      ? listTagKaitenColumnTitle(kaitenColTrimmed)
      : null;

  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [blockReasonDraft, setBlockReasonDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const closeAdd = useCallback(() => {
    setAddOpen(false);
    setNewLabel("");
    setBlockReasonDraft("");
    setErr(null);
  }, []);

  const submitAdd = useCallback(async (labelOverride?: string) => {
    const label = (labelOverride ?? newLabel).trim();
    setErr(null);
    if (!label) {
      setErr("Укажите текст тега");
      return;
    }
    const blockHit =
      Boolean(kaitenCardId) &&
      !kaitenBlocked &&
      customListTagLabelMeansKaitenBlock(label);
    if (blockHit) {
      const br = blockReasonDraft.trim();
      if (!br) {
        setErr("Укажите причину блокировки в поле ниже");
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/list-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          blockHit
            ? { label, blockReason: blockReasonDraft.trim() }
            : { label },
        ),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        kaitenUnblock?: KaitenUnblockFromListTagResult;
        kaitenBlock?: KaitenBlockFromListTagResult;
      };
      if (!res.ok) {
        setErr(data.error ?? "Не удалось добавить");
        return;
      }
      const ku = data.kaitenUnblock;
      if (ku?.kind === "error") {
        setErr(`Не удалось снять блокировку в Kaiten: ${ku.message}`);
        router.refresh();
        return;
      }
      if (ku?.kind === "skipped" && ku.reason === "kaiten_not_configured") {
        setErr("Kaiten не настроен — разблокировка не выполнена.");
        router.refresh();
        return;
      }
      const kb = data.kaitenBlock;
      if (kb?.kind === "error") {
        setErr(`Не удалось заблокировать в Kaiten: ${kb.message}`);
        router.refresh();
        return;
      }
      if (kb?.kind === "skipped" && kb.reason === "kaiten_not_configured") {
        setErr("Kaiten не настроен — блокировка не выполнена.");
        router.refresh();
        return;
      }
      if (kb?.kind === "skipped" && kb.reason === "already_blocked") {
        setErr("Карточка уже заблокирована — обновите список.");
        router.refresh();
        return;
      }
      if (kb?.kind === "skipped" && kb.reason === "no_card") {
        setErr("У наряда нет карточки Kaiten — блокировка недоступна.");
        router.refresh();
        return;
      }
      closeAdd();
      router.refresh();
    } catch {
      setErr("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  }, [blockReasonDraft, closeAdd, kaitenBlocked, kaitenCardId, newLabel, orderId, router]);

  const applyQuickPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      setErr(null);
      setBusy(true);
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(data.error ?? "Не удалось применить");
          return;
        }
        closeAdd();
        router.refresh();
      } catch {
        setErr("Сеть или сервер недоступны");
      } finally {
        setBusy(false);
      }
    },
    [closeAdd, orderId, router],
  );

  const removeTag = useCallback(
    async (label: string) => {
      if (!window.confirm(`Удалить тег «${label}» у этого наряда?`)) return;
      setBusy(true);
      try {
        const u = new URLSearchParams();
        u.set("label", label);
        const res = await fetch(
          `/api/orders/${orderId}/list-tags?${u.toString()}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          alert(data.error ?? "Не удалось удалить");
          return;
        }
        router.refresh();
      } catch {
        alert("Сеть или сервер недоступны");
      } finally {
        setBusy(false);
      }
    },
    [orderId, router],
  );

  const quickSuggestions = useMemo(
    () =>
      filterQuickOrderTagSuggestions(newLabel, {
        kaitenBlocked: kaitenBlocked === true,
        kaitenCanBlock: Boolean(kaitenCardId) && !kaitenBlocked,
      }),
    [newLabel, kaitenBlocked, kaitenCardId],
  );

  const onQuickSuggestion = useCallback(
    (s: QuickOrderTagSuggestion) => {
      if ("kaitenBlockFlow" in s && s.kaitenBlockFlow) {
        setNewLabel(QUICK_TAG_KAITEN_BLOCK_LABEL);
        setBlockReasonDraft("");
        setErr(null);
        return;
      }
      if ("listTagLabel" in s) {
        void submitAdd(s.listTagLabel);
        return;
      }
      if ("patch" in s) {
        void applyQuickPatch(s.patch);
      }
    },
    [applyQuickPatch, submitAdd],
  );

  const tagCloudItems = useMemo(() => {
    const href = (innerKey: string) =>
      tagHref(
        pageSize,
        innerKey,
        hideShipped,
        onlyShipped,
        listSearchQ,
        periodFrom,
        periodTo,
      );
    const items: TagCloudItem[] = [];

    if (kaitenBlocked) {
      items.push({
        key: "blocked",
        flex: "grow",
        node: (
          <Link
            href={href(LIST_TAG_KAITEN_BLOCKED)}
            title="Показать наряды, заблокированные в Kaiten"
            className={`inline-flex min-w-0 max-w-full flex-col items-stretch gap-y-0.5 rounded-xl border border-red-300 bg-red-50 text-left font-semibold text-red-950 shadow-sm outline-none focus-visible:outline-none dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-100 ${padTable}`}
          >
            <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap leading-tight">
              <span aria-hidden>⛔</span>
              <span>Заблокировано</span>
            </span>
            {kaitenBlockReason?.trim() ? (
              <span className="max-w-full whitespace-pre-wrap break-words text-left text-[10px] font-normal leading-snug text-red-900/95 dark:text-red-100/90 sm:text-[11px]">
                {kaitenBlockReason.trim()}
              </span>
            ) : (
              <span className="text-left text-[10px] font-normal leading-snug text-red-800/85 dark:text-red-200/80 sm:text-[11px]">
                Причина не в CRM — вкладка «Кайтен» или Kaiten
              </span>
            )}
          </Link>
        ),
      });
    }

    if (adminShippedOtpr) {
      items.push({
        key: "otpr",
        flex: "shrink",
        node: (
          <Link
            href={href(LIST_TAG_OTPR)}
            title="Отправлено — показать наряды с этой отметкой"
            aria-label="Отправлено"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm outline-none ring-1 ring-emerald-600/25 transition-opacity hover:opacity-90 focus-visible:outline-none dark:ring-emerald-400/25 sm:h-7 sm:w-7"
          >
            <svg
              className="h-3.5 w-3.5 sm:h-[1.125rem] sm:w-[1.125rem]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </Link>
        ),
      });
    }

    items.push({
      key: "kaiten",
      flex: "grow",
      node: kaitenFilterKey ? (
        <Link
          href={href(kaitenFilterKey)}
          title="Показать наряды в этой колонке Kaiten"
          className={`inline-flex min-w-0 max-w-full items-center truncate rounded-full px-2 py-0.5 text-left text-[11px] font-semibold uppercase leading-tight tracking-wide shadow-sm outline-none transition-opacity hover:opacity-90 focus-visible:outline-none sm:px-2.5 sm:py-1 sm:text-xs sm:leading-tight md:text-sm md:leading-tight ${
            LAB_WORK_STATUS_PILL_STYLES.TO_SCAN
          }`}
        >
          {kaitenLabel}
        </Link>
      ) : (
        <span
          title="Колонка доски Kaiten (обновляется в фоне на списке заказов)"
          className={`inline-flex min-w-0 max-w-full items-center truncate rounded-full px-2 py-0.5 text-left text-[11px] font-semibold uppercase leading-tight tracking-wide shadow-sm sm:px-2.5 sm:py-1 sm:text-xs sm:leading-tight md:text-sm md:leading-tight ${
            LAB_WORK_STATUS_PILL_STYLES.TO_SCAN
          }`}
        >
          {kaitenLabel}
        </span>
      ),
    });

    if (isUrgent) {
      items.push({
        key: "urgent",
        flex: "shrink",
        node: (
          <Link
            href={href(LIST_TAG_URGENT)}
            title="Показать срочные наряды"
            className={`inline-flex items-center rounded-full border border-rose-200 bg-rose-50 font-semibold leading-tight text-rose-950 shadow-sm outline-none focus-visible:outline-none dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100 ${padTable} sm:leading-tight md:leading-tight`}
          >
            {urgentCoefficient != null ? `×${urgentCoefficient}` : "Срочно"}
          </Link>
        ),
      });
    }

    if (prostheticsOrdered) {
      items.push({
        key: "prost",
        flex: "grow",
        node: (
          <Link
            href={href(LIST_TAG_PROSTHETICS)}
            title="Показать наряды с отметкой «Протетика заказана»"
            className={`rounded-full border border-emerald-200 bg-emerald-50 font-semibold text-emerald-900 shadow-sm outline-none focus-visible:outline-none dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 ${padTable}`}
          >
            Протетика заказана
          </Link>
        ),
      });
    }

    if (hasInvoiceAttachment) {
      items.push({
        key: "inv",
        flex: "shrink",
        node: (
          <Link
            href={href(LIST_TAG_INVOICE)}
            title="Показать наряды с загруженным счётом"
            className={`rounded-full border border-sky-300 bg-sky-50 font-semibold tracking-wide text-sky-950 shadow-sm outline-none focus-visible:outline-none dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100 ${padTable}`}
          >
            СЧЕТ
          </Link>
        ),
      });
    }

    if (invoicePrinted) {
      items.push({
        key: "invpr",
        flex: "grow",
        node: (
          <Link
            href={href(LIST_TAG_INVOICE_PRINTED)}
            title="Показать наряды с отметкой «Счёт распечатан»"
            className={`rounded-full border border-violet-300 bg-violet-50 font-semibold text-violet-950 shadow-sm outline-none focus-visible:outline-none dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-100 ${padTable}`}
          >
            Счёт распечатан
          </Link>
        ),
      });
    }

    for (const t of customTags) {
      const inner = listTagCustomLabel(t.label);
      items.push({
        key: `ct-${t.id}`,
        flex: "grow",
        node: (
          <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
            <Link
              href={href(inner)}
              title="Показать наряды с этим тегом"
              className={`min-w-0 max-w-full shrink truncate rounded-full border border-violet-200 bg-violet-50 font-semibold text-violet-950 shadow-sm outline-none focus-visible:outline-none dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-100 ${padTable}`}
            >
              {t.label}
            </Link>
            <button
              type="button"
              disabled={busy}
              className="rounded p-1 text-xs leading-none text-violet-700 hover:bg-violet-100 disabled:opacity-40 dark:text-violet-200 dark:hover:bg-violet-950/50"
              title="Удалить тег у этого наряда"
              aria-label={`Удалить тег ${t.label}`}
              onClick={() => void removeTag(t.label)}
            >
              ×
            </button>
          </span>
        ),
      });
    }

    items.push({
      key: "add",
      flex: "shrink",
      node: (
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] text-sm font-semibold leading-none text-[var(--text-muted)] shadow-sm outline-none hover:border-[var(--sidebar-blue)]/45 hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-blue)] focus-visible:outline-none disabled:opacity-40 sm:h-7 sm:w-7"
          title="Добавить свой тег к наряду"
          aria-label="Добавить тег"
          onClick={() => setAddOpen(true)}
        >
          +
        </button>
      ),
    });

    return items;
  }, [
    adminShippedOtpr,
    busy,
    customTags,
    hasInvoiceAttachment,
    invoicePrinted,
    isUrgent,
    kaitenBlocked,
    kaitenBlockReason,
    kaitenFilterKey,
    kaitenLabel,
    pageSize,
    hideShipped,
    onlyShipped,
    listSearchQ,
    periodFrom,
    periodTo,
    prostheticsOrdered,
    removeTag,
    urgentCoefficient,
  ]);

  const stripProstheticsPending =
    !prostheticsOrdered && listPendingProstheticsRequests;
  const useLeadingIconStrip =
    orderAttentionWarning || stripProstheticsPending;
  const prostheticsPendingHref = tagHref(
    pageSize,
    LIST_TAG_PROSTHETICS_PENDING,
    hideShipped,
    onlyShipped,
    listSearchQ,
    periodFrom,
    periodTo,
  );

  const blockReasonHit =
    Boolean(kaitenCardId) &&
    !kaitenBlocked &&
    customListTagLabelMeansKaitenBlock(newLabel.trim());

  return (
    <Fragment>
      <div
        className={
          useLeadingIconStrip
            ? "flex w-full min-w-0 max-w-full items-start gap-x-2"
            : "flex w-full min-w-0 max-w-full flex-col"
        }
        title="Отметки переносятся по ширине колонки таблицы"
      >
        {useLeadingIconStrip ? (
          <>
            <div className="flex shrink-0 flex-row flex-nowrap items-start gap-x-1.5 self-start sm:gap-x-2">
              {orderAttentionWarning ? (
                <Link
                  href={ordersListHref({
                    limit: pageSize,
                    tag: LIST_TAG_ORDER_ATTENTION,
                    hideShipped: hideShipped === true,
                    onlyShipped: onlyShipped === true,
                    q: listSearchQ?.trim() ? listSearchQ.trim() : undefined,
                    from: periodFrom?.trim() || undefined,
                    to: periodTo?.trim() || undefined,
                  })}
                  className="shrink-0 self-start text-inherit no-underline outline-none focus-visible:outline-none"
                  title="Показать в списке заказов все наряды с этой отметкой (корректировки «!!!» или несовпадение суммы со счётом)"
                  aria-label="Фильтр: внимание — корректировки или расхождение сумм"
                >
                  <span className="flex h-[2.75rem] w-[2.75rem] shrink-0 items-center justify-center rounded-full border border-amber-400/90 bg-amber-100 shadow-sm dark:border-amber-700 dark:bg-amber-950/70 sm:h-[3.25rem] sm:w-[3.25rem]">
                    <OrderAttentionWarningGlyph className="h-6 w-6 sm:h-7 sm:w-7" />
                  </span>
                </Link>
              ) : null}
              {stripProstheticsPending ? (
                <Link
                  href={prostheticsPendingHref}
                  title="Показать наряды с открытыми заявками по протетике из чата («???»)"
                  aria-label="Протетика: заявки из чата"
                  className="shrink-0 self-start text-inherit no-underline outline-none transition-opacity hover:opacity-90 focus-visible:outline-none"
                >
                  <span className="flex h-[2.75rem] w-[2.75rem] shrink-0 items-center justify-center rounded-full border border-sky-400/90 bg-sky-100 shadow-sm dark:border-sky-600 dark:bg-sky-950/75 sm:h-[3.25rem] sm:w-[3.25rem]">
                    <ProstheticsPendingGearGlyph className="h-6 w-6 sm:h-7 sm:w-7" />
                  </span>
                </Link>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className={TAG_CLOUD_CLASS}>
                {tagCloudItems.map((it) => (
                  <div
                    key={it.key}
                    className={
                      it.flex === "grow"
                        ? "flex min-h-0 min-w-0 max-w-full items-center [&>*]:min-w-0 [&>*]:max-w-full"
                        : "flex min-h-0 shrink-0 items-center [&>*]:max-w-full"
                    }
                  >
                    {it.node}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className={TAG_CLOUD_CLASS}>
            {tagCloudItems.map((it) => (
              <div
                key={it.key}
                className={
                  it.flex === "grow"
                    ? "flex min-h-0 min-w-0 max-w-full items-center [&>*]:min-w-0 [&>*]:max-w-full"
                    : "flex min-h-0 shrink-0 items-center [&>*]:max-w-full"
                }
              >
                {it.node}
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={closeAdd}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Новый тег"
            className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-[var(--app-text)]">
              Тег для списка
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Свой тег для фильтра в списке: буквы, цифры, пробелы, «.» «_» «-», без «:». По
              вводу от 2 символов ниже можно выбрать действие по наряду (срочность, счёт
              распечатан и т.д.) — без открытия карточки. Для заблокированного наряда введите{" "}
              <span className="whitespace-nowrap">«разблокировать»</span> и выберите
              «Разблокировать в Kaiten» или нажмите «Добавить»: тег в список не добавляется,
              только снятие блокировки в Kaiten. Для наряда с карточкой Kaiten без блокировки:
              метка <span className="whitespace-nowrap">«заблокировать»</span>, затем укажите
              причину в поле ниже и «Добавить» — тег не сохраняется, в Kaiten создаётся
              блокировка с этой причиной.
            </p>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="mt-3 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-base text-[var(--app-text)]"
              placeholder="Тег или поиск действия…"
              maxLength={48}
              autoFocus
            />
            {blockReasonHit ? (
              <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
                Причина блокировки
                <textarea
                  value={blockReasonDraft}
                  onChange={(e) => setBlockReasonDraft(e.target.value)}
                  className="mt-1 min-h-[4.5rem] w-full resize-y rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-base text-[var(--app-text)]"
                  rows={3}
                  maxLength={2000}
                  placeholder="Текст уйдёт в Kaiten и в подсказку в CRM"
                />
              </label>
            ) : null}
            {kaitenBlocked &&
            newLabel.trim().length > 0 &&
            customListTagLabelMeansKaitenUnblock(newLabel) ? (
              <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300/90">
                После «Добавить» блокировка в Kaiten будет снята; тег «разблокировать» не
                сохраняется.
              </p>
            ) : null}
            {blockReasonHit ? (
              <p className="mt-2 text-xs text-amber-900/95 dark:text-amber-200/90">
                После «Добавить» карточка будет заблокирована в Kaiten с указанной причиной;
                служебная метка «заблокировать» в список тегов не добавляется.
              </p>
            ) : null}
            {quickSuggestions.length > 0 ? (
              <div className="mt-3 max-h-52 space-y-1 overflow-y-auto rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] p-1.5">
                <p className="px-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Действия по наряду
                </p>
                {quickSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={busy}
                    className="flex w-full flex-col items-start rounded-md border border-transparent px-2 py-1.5 text-left text-sm text-[var(--app-text)] hover:border-[var(--sidebar-blue)]/35 hover:bg-[var(--card-bg)] disabled:opacity-40"
                    onClick={() => void onQuickSuggestion(s)}
                  >
                    <span className="font-medium">{s.title}</span>
                    {s.subtitle ? (
                      <span className="text-xs text-[var(--text-muted)]">
                        {s.subtitle}
                        {s.id === "invoice-printed-true" && invoicePrinted
                          ? " Сейчас уже отмечено."
                          : ""}
                      </span>
                    ) : s.id === "invoice-printed-true" && invoicePrinted ? (
                      <span className="text-xs text-[var(--text-muted)]">
                        Сейчас уже отмечено.
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
            {err ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-base text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={closeAdd}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={busy || !newLabel.trim()}
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-base font-medium text-white hover:opacity-95 disabled:opacity-50"
                onClick={() => void submitAdd(undefined)}
              >
                {busy ? "…" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Fragment>
  );
}
