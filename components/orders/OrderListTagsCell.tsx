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
  LIST_TAG_PAYMENT_EXPECTED,
  LIST_TAG_PAYMENT_PAID,
  LIST_TAG_PAYMENT_PARTIAL,
  LIST_TAG_PAYMENT_RECON,
  LIST_TAG_PAYMENT_RECON_PAID,
  LIST_TAG_PROSTHETICS,
  LIST_TAG_PROSTHETICS_PENDING,
  LIST_TAG_URGENT,
  listTagCustomLabel,
  listTagKaitenColumnTitle,
} from "@/lib/order-list-tag-filter";
import {
  filterQuickOrderTagSuggestions,
  QUICK_TAG_KAITEN_BLOCK_LABEL,
  QUICK_TAG_KAITEN_UNBLOCK_LABEL,
  type QuickOrderTagSuggestion,
} from "@/lib/order-list-quick-tag-suggestions";
import { ordersListHref } from "@/lib/orders-list-query";
import {
  isReconciliationPaymentStatus,
  canonicalOrderPayment,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PAID,
  ORDER_PAYMENT_PARTIAL,
  ORDER_PAYMENT_RECON_PAID,
  ORDER_PAYMENT_RECON_UNPAID,
} from "@/lib/order-clinic-client-fields";
import {
  URGENT_MENU_OPTIONS,
  urgentSelectionFromOrder,
} from "@/lib/order-urgency";

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
  payment: string | null;
  paymentPartialRub: number | null;
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

/**
 * Облако тегов в ячейке: не flex-wrap, а grid 4 колонки.
 * По ширине ряда — не больше одной «огромной» (col-span-4), двух «больших» (col-span-2) или четырёх «маленьких» (col-span-1).
 * Высота строк не ограничиваем. Новый тег — сразу задать slot в tagCloudItems; длинный текст внутри ячейки: min-w-0 + break-words, без отдельных max-w на всю полосу строки.
 * Порог «огромной» по символам — TAG_SLOT_HUGE_MIN_CHARS (блокировка Kaiten, длинный кастомный тег).
 */
const TAG_CLOUD_GRID_CLASS =
  "grid min-h-min w-full min-w-0 grid-cols-4 content-start items-start gap-x-1 gap-y-1.5";

/** Длинный текст → «огромная» пилюля на всю ширину ряда (4 колонки). ~28 ловит длинные кастомные подписи без простыни. */
const TAG_SLOT_HUGE_MIN_CHARS = 28;

type TagSlotSize = "huge" | "large" | "small";

function kaitenBlockedTagSlot(reason: string | null | undefined): "huge" | "large" {
  return (reason ?? "").trim().length >= TAG_SLOT_HUGE_MIN_CHARS ? "huge" : "large";
}

function customTagSlot(label: string): "huge" | "large" {
  return label.trim().length >= TAG_SLOT_HUGE_MIN_CHARS ? "huge" : "large";
}

function tagCloudCellClass(slot: TagSlotSize): string {
  const span =
    slot === "huge" ? "col-span-4" : slot === "large" ? "col-span-2" : "col-span-1";
  return `${span} flex min-h-0 min-w-0 items-start [&>*]:min-w-0`;
}
const TAG_EDIT_BUTTON_CLASS =
  "rounded p-1 text-xs leading-none hover:opacity-90";

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

type TagCloudItem = { key: string; slot: TagSlotSize; node: ReactNode };

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

function normalizedPayment(raw: string | null | undefined): string {
  const p = (raw ?? "").trim();
  if (p === "СВЕРКА") return ORDER_PAYMENT_RECON_UNPAID;
  return canonicalOrderPayment(p);
}

function paymentPillClass(paymentValue: string): string {
  if (paymentValue === ORDER_PAYMENT_PAID || paymentValue === ORDER_PAYMENT_RECON_PAID) {
    return "border-emerald-800/70 bg-emerald-900 text-emerald-50 dark:border-emerald-700/80 dark:bg-emerald-950 dark:text-emerald-100";
  }
  if (paymentValue === ORDER_PAYMENT_PARTIAL) {
    return "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100";
  }
  if (paymentValue === ORDER_PAYMENT_RECON_UNPAID) {
    return "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-700/70 dark:bg-sky-950/40 dark:text-sky-100";
  }
  return "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-700/70 dark:bg-rose-950/40 dark:text-rose-100";
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
  payment,
  paymentPartialRub,
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
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPartialDraft, setPaymentPartialDraft] = useState(
    paymentPartialRub != null ? String(paymentPartialRub) : "",
  );
  const [paymentPartialPrompt, setPaymentPartialPrompt] = useState(false);
  const [urgentOpen, setUrgentOpen] = useState(false);
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

  const applyPaymentPatch = useCallback(
    async (nextPayment: string, partialText?: string) => {
      const t = (partialText ?? "").trim();
      const parsed =
        t.length > 0 && Number.isFinite(Number(t)) && Number(t) >= 0
          ? Math.round(Number(t))
          : null;
      if (t.length > 0 && parsed == null) {
        setErr("Сумма частичной оплаты: укажите число или оставьте пусто");
        return;
      }
      await applyQuickPatch({
        payment: nextPayment,
        paymentPartialRub:
          nextPayment === ORDER_PAYMENT_PARTIAL ? parsed : null,
      });
    },
    [applyQuickPatch],
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

  const currentPayment = normalizedPayment(payment);
  const paymentIsRecon = isReconciliationPaymentStatus(currentPayment);
  const paymentPill = paymentIsRecon
    ? currentPayment === ORDER_PAYMENT_RECON_PAID
      ? "Сверка · оплачено"
      : "Сверка"
    : currentPayment === ORDER_PAYMENT_PARTIAL
      ? paymentPartialRub != null
        ? `Частично оплачено · ${paymentPartialRub} ₽`
        : "Частично оплачено"
      : currentPayment;
  const paymentFilterTag = paymentIsRecon
    ? currentPayment === ORDER_PAYMENT_RECON_PAID
      ? LIST_TAG_PAYMENT_RECON_PAID
      : LIST_TAG_PAYMENT_RECON
    : currentPayment === ORDER_PAYMENT_NOT_PAID
      ? LIST_TAG_PAYMENT_EXPECTED
      : currentPayment === ORDER_PAYMENT_PARTIAL
        ? LIST_TAG_PAYMENT_PARTIAL
        : currentPayment === ORDER_PAYMENT_PAID
          ? LIST_TAG_PAYMENT_PAID
          : null;
  const paymentPillToneClass = paymentPillClass(currentPayment);
  const urgentSelectionValue = urgentSelectionFromOrder(
    isUrgent,
    urgentCoefficient,
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
      const blockedSlot = kaitenBlockedTagSlot(kaitenBlockReason);
      items.push({
        key: "blocked",
        slot: blockedSlot,
        node: (
          <span className="inline-flex min-w-0 max-w-full items-start gap-0.5">
            <Link
              href={href(LIST_TAG_KAITEN_BLOCKED)}
              title="Показать наряды, заблокированные в Kaiten"
              className={`inline-flex min-w-0 flex-col items-stretch gap-y-1 rounded-xl border border-red-300 bg-red-50 text-left font-semibold text-red-950 shadow-sm outline-none focus-visible:outline-none dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-100 ${padTable} ${
                blockedSlot === "huge"
                  ? "w-full max-w-none"
                  : "w-full max-w-full sm:max-w-[min(100%,20rem)]"
              }`}
            >
              <span className="inline-flex shrink-0 items-center gap-1 leading-tight">
                <span aria-hidden className="shrink-0">
                  ⛔
                </span>
                <span className="leading-tight">Заблокировано</span>
              </span>
              {kaitenBlockReason?.trim() ? (
                <span className="w-full min-w-0 whitespace-pre-wrap break-words text-left text-[10px] font-normal leading-snug text-red-900/95 dark:text-red-100/90 sm:text-[11px]">
                  {kaitenBlockReason.trim()}
                </span>
              ) : (
                <span className="text-left text-[10px] font-normal leading-snug text-red-800/85 dark:text-red-200/80 sm:text-[11px]">
                  Причина не в CRM — вкладка «Кайтен» или Kaiten
                </span>
              )}
            </Link>
            <button
              type="button"
              disabled={busy}
              className={`${TAG_EDIT_BUTTON_CLASS} text-red-700 hover:bg-red-100 disabled:opacity-40 dark:text-red-200 dark:hover:bg-red-950/50`}
              title="Снять блокировку в Kaiten"
              aria-label="Снять блокировку в Kaiten"
              onClick={() => void submitAdd(QUICK_TAG_KAITEN_UNBLOCK_LABEL)}
            >
              ✎
            </button>
          </span>
        ),
      });
    }

    if (adminShippedOtpr) {
      items.push({
        key: "otpr",
        slot: "small",
        node: (
          <span className="inline-flex items-center gap-0.5">
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
            <button
              type="button"
              disabled={busy}
              className={`${TAG_EDIT_BUTTON_CLASS} text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:text-emerald-200 dark:hover:bg-emerald-950/50`}
              title="Снять отметку «Отправлено»"
              aria-label="Снять отметку отправлено"
              onClick={() => void applyQuickPatch({ adminShippedOtpr: false })}
            >
              ✎
            </button>
          </span>
        ),
      });
    }

    items.push({
      key: "kaiten",
      slot: "large",
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
        slot: "small",
        node: (
          <span className="inline-flex items-center gap-0.5">
            <Link
              href={href(LIST_TAG_URGENT)}
              title="Показать срочные наряды"
              className={`inline-flex items-center rounded-full border border-rose-200 bg-rose-50 font-semibold leading-tight text-rose-950 shadow-sm outline-none focus-visible:outline-none dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100 ${padTable} sm:leading-tight md:leading-tight`}
            >
              {urgentCoefficient != null ? `×${urgentCoefficient}` : "Срочно"}
            </Link>
            <button
              type="button"
              disabled={busy}
              className={`${TAG_EDIT_BUTTON_CLASS} text-rose-700 hover:bg-rose-100 disabled:opacity-40 dark:text-rose-200 dark:hover:bg-rose-950/50`}
              title="Изменить срочность"
              aria-label="Изменить срочность"
              onClick={() => setUrgentOpen(true)}
            >
              ✎
            </button>
          </span>
        ),
      });
    }

    if (prostheticsOrdered) {
      items.push({
        key: "prost",
        slot: "large",
        node: (
          <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
            <Link
              href={href(LIST_TAG_PROSTHETICS)}
              title="Показать наряды с отметкой «Протетика заказана»"
              className={`rounded-full border border-emerald-200 bg-emerald-50 font-semibold text-emerald-900 shadow-sm outline-none focus-visible:outline-none dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 ${padTable}`}
            >
              Протетика заказана
            </Link>
            <button
              type="button"
              disabled={busy}
              className={`${TAG_EDIT_BUTTON_CLASS} text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:text-emerald-200 dark:hover:bg-emerald-950/50`}
              title="Снять отметку «Протетика заказана»"
              aria-label="Снять отметку протетика заказана"
              onClick={() => void applyQuickPatch({ prostheticsOrdered: false })}
            >
              ✎
            </button>
          </span>
        ),
      });
    }

    if (hasInvoiceAttachment) {
      items.push({
        key: "inv",
        slot: "small",
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
        slot: "large",
        node: (
          <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
            <Link
              href={href(LIST_TAG_INVOICE_PRINTED)}
              title="Показать наряды с отметкой «Счёт распечатан»"
              className={`rounded-full border border-violet-300 bg-violet-50 font-semibold text-violet-950 shadow-sm outline-none focus-visible:outline-none dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-100 ${padTable}`}
            >
              Счёт распечатан
            </Link>
            <button
              type="button"
              disabled={busy}
              className={`${TAG_EDIT_BUTTON_CLASS} text-violet-700 hover:bg-violet-100 disabled:opacity-40 dark:text-violet-200 dark:hover:bg-violet-950/50`}
              title="Снять отметку «Счёт распечатан»"
              aria-label="Снять отметку счет распечатан"
              onClick={() => void applyQuickPatch({ invoicePrinted: false })}
            >
              ✎
            </button>
          </span>
        ),
      });
    }

    items.push({
      key: "pay",
      slot: "large",
      node: (
        <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
          {paymentFilterTag ? (
            <Link
              href={href(paymentFilterTag)}
              className={`min-w-0 max-w-full shrink truncate rounded-full border font-semibold shadow-sm outline-none focus-visible:outline-none ${paymentPillToneClass} ${padTable}`}
              title="Показать в списке заказы с этим статусом оплаты"
            >
              {paymentPill}
            </Link>
          ) : (
            <span
              className={`min-w-0 max-w-full shrink truncate rounded-full border font-semibold shadow-sm ${paymentPillToneClass} ${padTable}`}
            >
              {paymentPill}
            </span>
          )}
          <button
            type="button"
            className="rounded p-1 text-xs leading-none text-indigo-700 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-indigo-950/50"
            title="Изменить статус оплаты"
            aria-label="Изменить статус оплаты"
            onClick={() => {
              setPaymentPartialDraft(
                paymentPartialRub != null ? String(paymentPartialRub) : "",
              );
              setPaymentPartialPrompt(false);
              setPaymentOpen(true);
            }}
          >
            ✎
          </button>
        </span>
      ),
    });

    for (const t of customTags) {
      const inner = listTagCustomLabel(t.label);
      const ctSlot = customTagSlot(t.label);
      items.push({
        key: `ct-${t.id}`,
        slot: ctSlot,
        node: (
          <span className="inline-flex min-w-0 max-w-full items-start gap-0.5">
            <Link
              href={href(inner)}
              title="Показать наряды с этим тегом"
              className={`min-w-0 border border-violet-200 bg-violet-50 font-semibold text-violet-950 shadow-sm outline-none focus-visible:outline-none dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-100 ${padTable} ${
                ctSlot === "huge"
                  ? "w-full max-w-none whitespace-pre-wrap break-words rounded-xl px-2 py-1 text-left leading-snug"
                  : "max-w-full shrink truncate rounded-full"
              }`}
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
      slot: "small",
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
    paymentFilterTag,
    paymentPill,
    paymentPillToneClass,
    paymentPartialRub,
    prostheticsOrdered,
    applyQuickPatch,
    removeTag,
    submitAdd,
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
              <div className={TAG_CLOUD_GRID_CLASS}>
                {tagCloudItems.map((it) => (
                  <div key={it.key} className={tagCloudCellClass(it.slot)}>
                    {it.node}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className={TAG_CLOUD_GRID_CLASS}>
            {tagCloudItems.map((it) => (
              <div key={it.key} className={tagCloudCellClass(it.slot)}>
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

      {urgentOpen ? (
        <div
          className="fixed inset-0 z-[205] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setUrgentOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Срочность"
            className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-[var(--app-text)]">
              Срочность
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Выберите вариант срочности для этого наряда
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {URGENT_MENU_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={busy}
                  className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 ${
                    opt.value === urgentSelectionValue
                      ? "border-[var(--sidebar-blue)] bg-[var(--sidebar-blue)]/10 text-[var(--sidebar-blue)]"
                      : "border-[var(--card-border)] hover:bg-[var(--surface-hover)]"
                  }`}
                  onClick={() => {
                    void applyQuickPatch({ urgentSelection: opt.value });
                    setUrgentOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-base text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => setUrgentOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {paymentOpen ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => {
            setPaymentOpen(false);
            setPaymentPartialPrompt(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Статус оплаты"
            className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-[var(--app-text)]">
              Статус оплаты
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Текущий: <strong>{paymentPill}</strong>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {paymentIsRecon ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    onClick={() =>
                      void applyPaymentPatch(ORDER_PAYMENT_RECON_UNPAID)
                    }
                  >
                    Сверка-НЕ ОПЛАЧЕНО
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    onClick={() =>
                      void applyPaymentPatch(ORDER_PAYMENT_RECON_PAID)
                    }
                  >
                    Сверка-ОПЛАЧЕНО
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    onClick={() => void applyPaymentPatch(ORDER_PAYMENT_PAID)}
                  >
                    Оплачено
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    onClick={() => void applyPaymentPatch(ORDER_PAYMENT_NOT_PAID)}
                  >
                    Не оплачено
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    onClick={() => setPaymentPartialPrompt(true)}
                  >
                    Частично оплачено
                  </button>
                </>
              )}
            </div>

            {paymentPartialPrompt ? (
              <div className="mt-3 rounded-md border border-[var(--card-border)] p-3">
                <p className="text-sm text-[var(--text-muted)]">
                  Введите сумму (можно оставить пусто)
                </p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="mt-2 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-base text-[var(--app-text)]"
                  value={paymentPartialDraft}
                  onChange={(e) => setPaymentPartialDraft(e.target.value)}
                  placeholder="Например, 15000"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
                    onClick={() => setPaymentPartialPrompt(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
                    onClick={() =>
                      void applyPaymentPatch(
                        ORDER_PAYMENT_PARTIAL,
                        paymentPartialDraft,
                      )
                    }
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-base text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  setPaymentOpen(false);
                  setPaymentPartialPrompt(false);
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Fragment>
  );
}
