"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  customListTagLabelMeansKaitenBlock,
  type KaitenBlockFromListTagResult,
} from "@/lib/custom-list-tag-kaiten-block-label";
import {
  customListTagLabelMeansKaitenUnblock,
  type KaitenUnblockFromListTagResult,
} from "@/lib/custom-list-tag-kaiten-unblock-label";
import {
  LIST_TAG_EDO,
  LIST_TAG_FINANCE_CALCULATED,
  LIST_TAG_FINANCE_NOT_CALCULATED,
  LIST_TAG_INVOICE,
  LIST_TAG_INVOICE_PRINTED,
  LIST_TAG_KAITEN_BLOCKED,
  LIST_TAG_NO_EDO,
  LIST_TAG_PAYMENT_EXPECTED,
  LIST_TAG_PAYMENT_PAID,
  LIST_TAG_PAYMENT_PARTIAL,
  LIST_TAG_PAYMENT_RECON,
  LIST_TAG_PAYMENT_RECON_PAID,
  LIST_TAG_PROSTHETICS,
  LIST_TAG_URGENT_NO_COEF,
  listTagCustomLabel,
  listTagKaitenColumnTitle,
  listTagUrgentCoefficient,
} from "@/lib/order-list-tag-filter";
import {
  filterQuickOrderTagSuggestions,
  QUICK_TAG_KAITEN_BLOCK_LABEL,
  QUICK_TAG_KAITEN_UNBLOCK_LABEL,
  type QuickOrderTagSuggestion,
} from "@/lib/order-list-quick-tag-suggestions";
import { ordersListHref } from "@/lib/orders-list-query";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import { shipmentsListHref } from "@/lib/shipments-list-query";
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
  URGENT_UNSET,
  urgentSelectionFromOrder,
} from "@/lib/order-urgency";
import { OrderListKaitenColumnTag } from "@/components/orders/OrderListKaitenColumnTag";
import { OrderPaymentModalAccountingUpload } from "@/components/orders/OrderPaymentModalAccountingUpload";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import {
  paymentValueToHarmonyTone,
  resolveListPillClass,
  type HarmonyPillTone,
} from "@/lib/harmony-list-pill";

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
  kaitenTrackLane?: string | null;
  prostheticsOrdered: boolean;
  /**
   * Открытые заявки «???» по протетике — оставляем в API для совместимости;
   * в облаке тегов не рисуем (акцент строки списка).
   */
  listPendingProstheticsRequests?: boolean;
  /** Отметка «Счёт распечатан» (как в наряде) */
  invoicePrinted?: boolean;
  /** Загружен файл счёта (вкладка «Документооборот») */
  hasInvoiceAttachment: boolean;
  /** ID файла счёта; нужен для печати из быстрого действия. */
  invoiceAttachmentId?: string | null;
  /** Бумажные документы распечатаны (`invoicePaperDocs`). */
  invoicePaperDocs?: boolean;
  /** Отправлен в ЭДО (`invoiceSentToEdo`). */
  invoiceSentToEdo?: boolean;
  /** Подпись в ЭДО (`invoiceEdoSigned`). */
  invoiceEdoSigned?: boolean;
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
  /** Непринятые корректировки — окраска строки, не пилюля. */
  orderAttentionWarning?: boolean;
  listPendingChatCorrections?: boolean;
  listCompositionMismatch?: boolean;
  /** Если задано — ссылки фильтра по пилюлям ведут на «Отгрузки», а не на «Заказы». */
  shipmentsFilterContext?: {
    tab: string;
    periodFrom: string | null;
    periodTo: string | null;
  } | null;
  /** Если задано — добавляем статус просчёта и ведём фильтры на «ФинОтдел». */
  financeOfficeFilterContext?: {
    tab: string;
    periodFrom: string | null;
    periodTo: string | null;
    q?: string | null;
  } | null;
  financeCalculated?: boolean | null;
  /** ЭДО клиники (или ИП врача); только в ФинОтделе. */
  clinicWorksWithEdo?: boolean | null;
  /** Клиника наряда (null — частная практика). */
  clinicId?: string | null;
  /** Врач наряда — для пополнения депозита врача. */
  doctorId?: string | null;
  /** На mobile пилюля колонки Kaiten уже под № наряда — не дублировать в облаке тегов. */
  omitKaitenColumnTag?: boolean;
};

const padTable =
  "order-list-tag-pill";

/**
 * Облако тегов: адаптивная плотная упаковка без жёстких шаблонов.
 * Пилюли не растягиваются на всю строку, а занимают естественную ширину
 * с мягкими лимитами через clamp; длинный текст переносится внутри пилюли.
 */
const TAG_CLOUD_PACK_CLASS =
  "order-list-tags-pack flex min-h-min w-full min-w-0 flex-wrap content-center items-center gap-x-1 gap-y-1";

const TAG_ADD_BUTTON_CLASS =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold leading-none text-[var(--text-muted)] shadow-sm outline-none hover:border-[var(--sidebar-blue)]/45 hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-blue)] focus-visible:outline-none disabled:opacity-40 sm:h-6 sm:w-6";

/** Длинный текст → слот «огромная» (две колонки сетки, перенос вниз). ~28 ловит длинные кастомные подписи. */
const TAG_SLOT_HUGE_MIN_CHARS = 28;

type TagSlotSize = "huge" | "large" | "small";

function kaitenBlockedTagSlot(reason: string | null | undefined): "huge" | "large" {
  return (reason ?? "").trim().length >= TAG_SLOT_HUGE_MIN_CHARS ? "huge" : "large";
}

function customTagSlot(label: string): "huge" | "large" {
  return label.trim().length >= TAG_SLOT_HUGE_MIN_CHARS ? "huge" : "large";
}

function tagCloudCellClass(slot: TagSlotSize): string {
  if (slot === "huge") {
    return "flex min-w-0 w-full max-w-full grow-0 shrink basis-auto items-center sm:max-w-[clamp(12rem,42vw,17rem)] [&>*]:min-w-0 [&>*]:max-w-full";
  }
  if (slot === "large") {
    return "flex min-w-0 max-w-full grow-0 shrink basis-auto items-center [&>*]:min-w-0 [&>*]:max-w-full";
  }
  return "flex min-w-0 max-w-full grow-0 shrink-0 basis-auto items-center [&>*]:max-w-full";
}
function useOverlayDismiss(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);
}

function renderTagsOverlay(
  open: boolean,
  ariaLabel: string,
  onClose: () => void,
  children: ReactNode,
  dialogClassName = "w-full max-w-sm",
) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`${dialogClassName} rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

type TagCloudItem = { key: string; slot: TagSlotSize; node: ReactNode };

type MissingTagAction =
  | {
      id: string;
      title: string;
      subtitle?: string;
      kind: "patch";
      patch: Record<string, unknown>;
      /** Не закрывать «+» после PATCH (несколько переключений подряд). */
      keepAddOpen?: boolean;
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      kind: "invoicePrint";
      attachmentId: string;
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      kind: "payment";
      payment: string;
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      kind: "partialPayment";
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      kind: "urgent";
      urgentSelection: string;
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      kind: "listTag";
      listTagLabel: string;
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      kind: "kaitenBlockFlow";
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      kind: "deposit";
    };

function buildTagRows(items: TagCloudItem[]): TagCloudItem[][] {
  const rows: TagCloudItem[][] = [];
  let current: TagCloudItem[] = [];

  const flushCurrent = () => {
    if (current.length === 0) return;
    rows.push(current);
    current = [];
  };

  for (const it of items) {
    // "Большая/огромная" заблокировка — всегда отдельной строкой.
    if (it.key === "blocked" && it.slot === "huge") {
      flushCurrent();
      rows.push([it]);
      continue;
    }
    if (it.slot === "huge") {
      flushCurrent();
      rows.push([it]);
      continue;
    }
    if (current.length >= 2) flushCurrent();
    current.push(it);
    if (current.length >= 2) flushCurrent();
  }
  flushCurrent();
  return rows;
}

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
  kaitenTrackLane = null,
  prostheticsOrdered,
  invoicePrinted = false,
  hasInvoiceAttachment,
  invoiceAttachmentId = null,
  invoicePaperDocs = false,
  invoiceSentToEdo = false,
  invoiceEdoSigned = false,
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
  shipmentsFilterContext = null,
  financeOfficeFilterContext = null,
  financeCalculated = null,
  clinicWorksWithEdo = null,
  omitKaitenColumnTag = false,
  clinicId = null,
  doctorId = null,
}: Props) {
  const router = useRouter();
  const isHarmony = useUiDesign() === "harmony";
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
  const [depositMode, setDepositMode] = useState(false);
  const [depositParty, setDepositParty] = useState<"CLINIC" | "DOCTOR" | null>(
    null,
  );
  const [depositAmount, setDepositAmount] = useState("");

  const closeAdd = useCallback(() => {
    setAddOpen(false);
    setNewLabel("");
    setBlockReasonDraft("");
    setErr(null);
    setDepositMode(false);
    setDepositParty(null);
    setDepositAmount("");
  }, []);

  const closePayment = useCallback(() => {
    setPaymentOpen(false);
    setPaymentPartialPrompt(false);
  }, []);

  const closeUrgent = useCallback(() => setUrgentOpen(false), []);

  useOverlayDismiss(addOpen, closeAdd);
  useOverlayDismiss(paymentOpen, closePayment);
  useOverlayDismiss(urgentOpen, closeUrgent);

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
    async (
      patch: Record<string, unknown>,
      opts?: { keepAddOpen?: boolean },
    ) => {
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
        if (!opts?.keepAddOpen) closeAdd();
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
  const paymentHarmonyTone = paymentValueToHarmonyTone(currentPayment);
  const urgentSelectionValue = urgentSelectionFromOrder(
    isUrgent,
    urgentCoefficient,
  );

  const availableMissingTagActions = useMemo(() => {
    const actions: MissingTagAction[] = [];

    if (kaitenBlocked) {
      actions.push({
        id: "kaiten-unblock",
        title: "Разблокировать",
        subtitle: "Снять блокировку без сохранения тега",
        kind: "listTag",
        listTagLabel: QUICK_TAG_KAITEN_UNBLOCK_LABEL,
      });
    } else if (kaitenCardId) {
      actions.push({
        id: "kaiten-block",
        title: "Заблокировать",
        subtitle: "Нужно указать причину ниже",
        kind: "kaitenBlockFlow",
      });
    }

    if (!prostheticsOrdered) {
      actions.push({
        id: "prosthetics-ordered",
        title: "Протетика заказана",
        subtitle: "Поставить отметку по протетике",
        kind: "patch",
        patch: { prostheticsOrdered: true },
      });
    }

    for (const opt of URGENT_MENU_OPTIONS) {
      if (opt.value === urgentSelectionValue) continue;
      if (opt.value === URGENT_UNSET && !isUrgent) continue;
      actions.push({
        id: `urgent-${opt.value}`,
        title:
          opt.value === URGENT_UNSET ? "Без срочности" : `Срочность ${opt.label}`,
        subtitle: "Срочность наряда",
        kind: "urgent",
        urgentSelection: opt.value,
      });
    }

    if (!invoicePrinted && invoiceAttachmentId) {
      actions.push({
        id: "invoice-print",
        title: "Печать счёта",
        subtitle: "Откроет печать файла и затем отметит «Счёт распечатан»",
        kind: "invoicePrint",
        attachmentId: invoiceAttachmentId,
      });
    }

    const docFlags: Array<{
      id: string;
      title: string;
      field: "invoicePaperDocs" | "invoiceSentToEdo" | "invoiceEdoSigned";
      on: boolean;
    }> = [
      {
        id: "paper-docs",
        title: "бум доки",
        field: "invoicePaperDocs",
        on: invoicePaperDocs,
      },
      {
        id: "sent-edo",
        title: "отпр эдо",
        field: "invoiceSentToEdo",
        on: invoiceSentToEdo,
      },
      {
        id: "edo-signed",
        title: "пдпс эдо",
        field: "invoiceEdoSigned",
        on: invoiceEdoSigned,
      },
    ];
    for (const flag of docFlags) {
      actions.push({
        id: flag.on ? `unset-${flag.id}` : `set-${flag.id}`,
        title: flag.on ? `Снять: ${flag.title}` : flag.title,
        subtitle: flag.on
          ? "Снять отметку у наряда"
          : "Поставить отметку у наряда",
        kind: "patch",
        patch: { [flag.field]: !flag.on },
        keepAddOpen: true,
      });
    }

    const paymentActions: MissingTagAction[] = [
      {
        id: "payment-not-paid",
        title: "Не оплачено",
        subtitle: "Статус оплаты",
        kind: "payment",
        payment: ORDER_PAYMENT_NOT_PAID,
      },
      {
        id: "payment-paid",
        title: "Оплачено",
        subtitle: "Статус оплаты",
        kind: "payment",
        payment: ORDER_PAYMENT_PAID,
      },
      {
        id: "payment-partial",
        title: "Частично оплачено",
        subtitle: "Статус оплаты, можно указать сумму",
        kind: "partialPayment",
      },
    ];
    actions.push(
      ...paymentActions.filter((action) => {
        if (action.kind === "partialPayment") {
          return currentPayment !== ORDER_PAYMENT_PARTIAL;
        }
        if (action.kind !== "payment") return true;
        return action.payment !== currentPayment;
      }),
    );

    if (doctorId || clinicId) {
      actions.push({
        id: "deposit-topup",
        title: "Депозит",
        subtitle: "Переплата на клинику или врача из этого наряда",
        kind: "deposit",
      });
    }

    return actions;
  }, [
    currentPayment,
    clinicId,
    doctorId,
    invoiceAttachmentId,
    invoicePrinted,
    invoicePaperDocs,
    invoiceSentToEdo,
    invoiceEdoSigned,
    isUrgent,
    kaitenBlocked,
    kaitenCardId,
    prostheticsOrdered,
    urgentSelectionValue,
  ]);

  const printInvoiceAndMark = useCallback(
    async (attachmentId: string) => {
      const attId = attachmentId.trim();
      if (!attId) return;
      setErr(null);
      const printUrl = `/api/orders/${orderId}/attachments/${attId}?inline=1`;

      await new Promise<void>((resolve) => {
        const iframe = document.createElement("iframe");
        let done = false;
        let fallbackTimer: number | null = null;
        const cleanup = () => {
          if (done) return;
          done = true;
          if (fallbackTimer) window.clearTimeout(fallbackTimer);
          window.setTimeout(() => iframe.remove(), 1_000);
          resolve();
        };
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "1px";
        iframe.style.height = "1px";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        iframe.onload = () => {
          const win = iframe.contentWindow;
          if (!win) {
            window.open(printUrl, "_blank", "noopener,noreferrer");
            cleanup();
            return;
          }
          win.addEventListener("afterprint", cleanup, { once: true });
          window.addEventListener("afterprint", cleanup, { once: true });
          fallbackTimer = window.setTimeout(cleanup, 2_000);
          try {
            win.focus();
            win.print();
          } catch {
            window.open(printUrl, "_blank", "noopener,noreferrer");
            cleanup();
          }
        };
        iframe.src = printUrl;
        document.body.appendChild(iframe);
      });

      await applyQuickPatch({ invoicePrinted: true });
    },
    [applyQuickPatch, orderId],
  );

  const onMissingTagAction = useCallback(
    (action: MissingTagAction) => {
      if (action.kind === "patch") {
        void applyQuickPatch(action.patch, {
          keepAddOpen: action.keepAddOpen === true,
        });
        return;
      }
      if (action.kind === "invoicePrint") {
        void printInvoiceAndMark(action.attachmentId);
        return;
      }
      if (action.kind === "payment") {
        void applyPaymentPatch(action.payment);
        return;
      }
      if (action.kind === "partialPayment") {
        setAddOpen(false);
        setPaymentPartialDraft(
          paymentPartialRub != null ? String(paymentPartialRub) : "",
        );
        setPaymentPartialPrompt(true);
        setPaymentOpen(true);
        return;
      }
      if (action.kind === "urgent") {
        void applyQuickPatch({ urgentSelection: action.urgentSelection });
        return;
      }
      if (action.kind === "listTag") {
        void submitAdd(action.listTagLabel);
        return;
      }
      if (action.kind === "deposit") {
        setDepositMode(true);
        setDepositParty(clinicId ? "CLINIC" : "DOCTOR");
        setDepositAmount("");
        setErr(null);
        return;
      }
      setNewLabel(QUICK_TAG_KAITEN_BLOCK_LABEL);
      setBlockReasonDraft("");
      setErr(null);
    },
    [applyPaymentPatch, applyQuickPatch, clinicId, paymentPartialRub, printInvoiceAndMark, submitAdd],
  );

  const filterListHref = useCallback(
    (innerKey: string) => {
      if (financeOfficeFilterContext) {
        return financeOfficeListHref({
          tab: financeOfficeFilterContext.tab,
          tag: innerKey,
          from: financeOfficeFilterContext.periodFrom ?? undefined,
          to: financeOfficeFilterContext.periodTo ?? undefined,
          q: financeOfficeFilterContext.q ?? undefined,
        });
      }
      if (shipmentsFilterContext) {
        return shipmentsListHref({
          tab: shipmentsFilterContext.tab,
          tag: innerKey,
          from: shipmentsFilterContext.periodFrom ?? undefined,
          to: shipmentsFilterContext.periodTo ?? undefined,
        });
      }
      return tagHref(
        pageSize,
        innerKey,
        hideShipped,
        onlyShipped,
        listSearchQ,
        periodFrom,
        periodTo,
      );
    },
    [
      financeOfficeFilterContext,
      shipmentsFilterContext,
      pageSize,
      hideShipped,
      onlyShipped,
      listSearchQ,
      periodFrom,
      periodTo,
    ],
  );

  const tagCloudItems = useMemo(() => {
    const href = filterListHref;
    const items: TagCloudItem[] = [];
    const listPill = (classic: string, tone: HarmonyPillTone) =>
      resolveListPillClass(isHarmony, classic, tone);
    const paymentStatusPillClass = isHarmony
      ? `${listPill("", paymentHarmonyTone)} min-w-0 max-w-full shrink truncate ${padTable}`
      : `min-w-0 max-w-full shrink truncate rounded-full border font-semibold shadow-sm ${paymentPillToneClass} ${padTable}`;

    if (kaitenBlocked) {
      const blockedSlot = kaitenBlockedTagSlot(kaitenBlockReason);
      items.push({
        key: "blocked",
        slot: blockedSlot,
        node: (
          <Link prefetch={false}
            href={href(LIST_TAG_KAITEN_BLOCKED)}
            title="Показать наряды, заблокированные в Kaiten"
            className={
              isHarmony
                ? `harmony-blocked-tag inline-flex w-full min-w-0 max-w-full flex-col items-stretch gap-y-1 text-left font-semibold outline-none focus-visible:outline-none ${padTable}`
                : `inline-flex w-full min-w-0 max-w-full flex-col items-stretch gap-y-1 rounded-xl border border-red-300 bg-red-50 text-left font-semibold text-red-950 shadow-sm outline-none focus-visible:outline-none dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-100 ${padTable}`
            }
          >
            <span className="leading-tight">Заблокировано</span>
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
        ),
      });
    }

    if (prostheticsOrdered) {
      items.push({
        key: "prosthetics-ordered",
        slot: "large",
        node: (
          <Link
            prefetch={false}
            href={href(LIST_TAG_PROSTHETICS)}
            title="Показать наряды с отметкой «Протетика заказана»"
            className={`rounded-full border border-emerald-300 bg-emerald-50 font-semibold text-emerald-950 shadow-sm outline-none focus-visible:outline-none dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 ${padTable}`}
          >
            Протетика заказана
          </Link>
        ),
      });
    }

    if (!shipmentsFilterContext && !omitKaitenColumnTag) {
      items.push({
        key: "kaiten",
        slot: "large",
        node: (
          <OrderListKaitenColumnTag
            kaitenCardId={kaitenCardId}
            demoKanbanColumn={demoKanbanColumn}
            demoCardTypeName={demoCardTypeName}
            kaitenColumnTitle={kaitenColumnTitle}
            kaitenTrackLane={kaitenTrackLane}
            kaitenBlocked={kaitenBlocked}
            kaitenBlockReason={kaitenBlockReason}
            filterHref={
              kaitenBlocked
                ? href(LIST_TAG_KAITEN_BLOCKED)
                : kaitenFilterKey
                  ? href(kaitenFilterKey)
                  : null
            }
            makeTagHref={href}
          />
        ),
      });
    }

    if (financeOfficeFilterContext && financeCalculated != null) {
      const financeTag = financeCalculated
        ? LIST_TAG_FINANCE_CALCULATED
        : LIST_TAG_FINANCE_NOT_CALCULATED;
      items.push({
        key: "finance-calculated",
        slot: "large",
        node: (
          <Link prefetch={false}
            href={href(financeTag)}
            title={
              financeCalculated
                ? "Показать просчитанные наряды"
                : "Показать непросчитанные наряды"
            }
            className={`rounded-full border font-semibold shadow-sm outline-none focus-visible:outline-none ${
              financeCalculated
                ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100"
                : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
            } ${padTable}`}
          >
            {financeCalculated ? "Просчитано" : "Не просчитано"}
          </Link>
        ),
      });
    }

    if (financeOfficeFilterContext && clinicWorksWithEdo != null) {
      const edoTag = clinicWorksWithEdo ? LIST_TAG_EDO : LIST_TAG_NO_EDO;
      items.push({
        key: "clinic-edo",
        slot: "small",
        node: (
          <Link prefetch={false}
            href={href(edoTag)}
            title={
              clinicWorksWithEdo
                ? "Клиника работает по ЭДО — показать такие наряды"
                : "Клиника без ЭДО — показать такие наряды"
            }
            className={`rounded-full border font-semibold shadow-sm outline-none focus-visible:outline-none ${
              clinicWorksWithEdo
                ? "border-teal-300 bg-teal-50 text-teal-950 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-100"
                : "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-100"
            } ${padTable}`}
          >
            {clinicWorksWithEdo ? "ЭДО" : "БЕЗ ЭДО"}
          </Link>
        ),
      });
    }

    if (isUrgent) {
      items.push({
        key: "urgent",
        slot: "small",
        node: (
          <Link prefetch={false}
            href={href(
              urgentCoefficient != null
                ? listTagUrgentCoefficient(urgentCoefficient)
                : LIST_TAG_URGENT_NO_COEF,
            )}
            title="Показать срочные наряды"
            className={`inline-flex items-center rounded-full border border-rose-200 bg-rose-50 font-semibold leading-tight text-rose-950 shadow-sm outline-none focus-visible:outline-none dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100 ${padTable} sm:leading-tight md:leading-tight`}
          >
            {urgentCoefficient != null ? `×${urgentCoefficient}` : "Срочно"}
          </Link>
        ),
      });
    }

    if (hasInvoiceAttachment) {
      items.push({
        key: "inv",
        slot: "small",
        node: (
          <Link prefetch={false}
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
          <Link prefetch={false}
            href={href(LIST_TAG_INVOICE_PRINTED)}
            title="Показать наряды с отметкой «Счёт распечатан»"
            className={`rounded-full border border-violet-300 bg-violet-50 font-semibold text-violet-950 shadow-sm outline-none focus-visible:outline-none dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-100 ${padTable}`}
          >
            Счёт распечатан
          </Link>
        ),
      });
    }

    items.push({
      key: "pay",
      slot: "large",
      node: paymentFilterTag ? (
        <Link prefetch={false}
          href={href(paymentFilterTag)}
          className={`outline-none focus-visible:outline-none ${paymentStatusPillClass}`}
          title={
            shipmentsFilterContext
              ? "Показать в отгрузках наряды с этим статусом оплаты"
              : "Показать в списке заказы с этим статусом оплаты"
          }
        >
          {paymentPill}
        </Link>
      ) : (
        <span className={paymentStatusPillClass}>{paymentPill}</span>
      ),
    });

    if (invoicePaperDocs) {
      items.push({
        key: "paper-docs",
        slot: "small",
        node: (
          <span
            className={`rounded-full border border-stone-300 bg-stone-50 font-semibold text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-100 ${padTable}`}
            title="Бумажные документы распечатаны"
          >
            бум доки
          </span>
        ),
      });
    }
    if (invoiceSentToEdo) {
      items.push({
        key: "sent-edo",
        slot: "small",
        node: (
          <span
            className={`rounded-full border border-cyan-300 bg-cyan-50 font-semibold text-cyan-950 shadow-sm dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-100 ${padTable}`}
            title="Отправлен в ЭДО"
          >
            отпр эдо
          </span>
        ),
      });
    }
    if (invoiceEdoSigned) {
      items.push({
        key: "edo-signed",
        slot: "small",
        node: (
          <span
            className={`rounded-full border border-indigo-300 bg-indigo-50 font-semibold text-indigo-950 shadow-sm dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-100 ${padTable}`}
            title="Подпись в ЭДО"
          >
            пдпс эдо
          </span>
        ),
      });
    }

    for (const t of customTags) {
      const inner = listTagCustomLabel(t.label);
      const ctSlot = customTagSlot(t.label);
      items.push({
        key: `ct-${t.id}`,
        slot: ctSlot,
        node: (
          <span className="inline-flex min-w-0 max-w-full items-start gap-0.5">
            <Link prefetch={false}
              href={href(inner)}
              title="Показать наряды с этим тегом"
              className={`min-w-0 border border-violet-200 bg-violet-50 font-semibold text-violet-950 shadow-sm outline-none focus-visible:outline-none dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-100 ${padTable} ${
                ctSlot === "huge"
                  ? "w-full max-w-full whitespace-pre-wrap break-words rounded-xl px-2 py-1 text-left leading-snug"
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

    return items;
  }, [
    busy,
    customTags,
    financeCalculated,
    clinicWorksWithEdo,
    financeOfficeFilterContext,
    hasInvoiceAttachment,
    invoicePrinted,
    invoicePaperDocs,
    invoiceSentToEdo,
    invoiceEdoSigned,
    isUrgent,
    kaitenBlocked,
    kaitenBlockReason,
    kaitenFilterKey,
    kaitenCardId,
    demoKanbanColumn,
    demoCardTypeName,
    kaitenColumnTitle,
    kaitenTrackLane,
    shipmentsFilterContext,
    pageSize,
    hideShipped,
    onlyShipped,
    listSearchQ,
    periodFrom,
    periodTo,
    paymentFilterTag,
    isHarmony,
    paymentHarmonyTone,
    paymentPill,
    paymentPillToneClass,
    paymentPartialRub,
    removeTag,
    urgentCoefficient,
    omitKaitenColumnTag,
    filterListHref,
    prostheticsOrdered,
  ]);

  const blockReasonHit =
    Boolean(kaitenCardId) &&
    !kaitenBlocked &&
    customListTagLabelMeansKaitenBlock(newLabel.trim());

  const addTagButton = (
    <button
      type="button"
      disabled={busy}
      className={TAG_ADD_BUTTON_CLASS}
      title="Добавить свой тег к наряду"
      aria-label="Добавить тег"
      onClick={() => setAddOpen(true)}
    >
      +
    </button>
  );

  const tagRows = buildTagRows(tagCloudItems);
  const lastRowIdx = tagRows.length - 1;

  // «+» в последней строке облака — иначе при huge «Заблокировано» (w-full)
  // кнопка уезжала под весь блок, а не вставала справа от «НЕ ОПЛАЧЕНО».
  const tagsWithAddButton = (
    <div className="flex min-w-0 max-w-full flex-col gap-y-1.5">
      {tagRows.length === 0 ? (
        <div className={TAG_CLOUD_PACK_CLASS}>
          <div className="shrink-0">{addTagButton}</div>
        </div>
      ) : (
        tagRows.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className={TAG_CLOUD_PACK_CLASS}>
            {row.map((it) => (
              <div key={it.key} className={tagCloudCellClass(it.slot)}>
                {it.node}
              </div>
            ))}
            {rowIdx === lastRowIdx ? (
              <div className="shrink-0">{addTagButton}</div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );

  return (
    <Fragment>
      <style>{`
        .order-list-tags-root {
          container-type: inline-size;
        }
        .order-list-tag-pill {
          display: inline-flex;
          align-items: center;
          font-size: 0.88em;
          line-height: 1.05;
          padding: 0.22em 0.72em;
        }
        @container (max-width: 11.5rem) {
          .order-list-tags-pack {
            gap: 0.25rem;
          }
          .order-list-tag-pill {
            font-size: 0.78em;
            padding: 0.16em 0.58em;
            letter-spacing: 0.01em;
          }
        }
        @container (max-width: 9rem) {
          .order-list-tags-pack {
            gap: 0.2rem;
          }
          .order-list-tag-pill {
            font-size: 0.7em;
            padding: 0.12em 0.48em;
            letter-spacing: 0;
          }
        }
      `}</style>
      <div
        className="order-list-tags-root flex w-full min-w-0 max-w-full flex-col overflow-hidden"
        title="Отметки переносятся по ширине колонки таблицы"
      >
        {tagsWithAddButton}
      </div>

      {renderTagsOverlay(addOpen, "Новый тег", closeAdd, (
        <>
            <p className="text-base font-semibold text-[var(--app-text)]">
              Тег для списка
            </p>
            {availableMissingTagActions.length > 0 ? (
              <div className="mt-3 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-2">
                <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Можно добавить к этому наряду
                </p>
                <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                  {availableMissingTagActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={busy}
                      className="rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-left text-xs font-semibold text-[var(--app-text)] hover:border-[var(--sidebar-blue)]/45 hover:bg-[var(--surface-hover)] disabled:opacity-40"
                      title={action.subtitle}
                      onClick={() => onMissingTagAction(action)}
                    >
                      {action.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Все быстрые отметки уже есть у этого наряда. Можно добавить свой тег для
                фильтра списка.
              </p>
            )}
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
            {depositMode ? (
              <div className="mt-3 space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Депозит / переплата
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || !doctorId}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-40 ${
                      depositParty === "DOCTOR"
                        ? "border-[var(--sidebar-blue)] bg-[var(--sidebar-blue)] text-white"
                        : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--app-text)]"
                    }`}
                    onClick={() => setDepositParty("DOCTOR")}
                  >
                    Доктор
                  </button>
                  <button
                    type="button"
                    disabled={busy || !clinicId}
                    title={
                      clinicId
                        ? undefined
                        : "В наряде нет клиники (частная практика)"
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-40 ${
                      depositParty === "CLINIC"
                        ? "border-[var(--sidebar-blue)] bg-[var(--sidebar-blue)] text-white"
                        : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--app-text)]"
                    }`}
                    onClick={() => setDepositParty("CLINIC")}
                  >
                    Клиника
                  </button>
                </div>
                <label className="block text-sm text-[var(--text-body)]">
                  Сумма, ₽
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-base text-[var(--app-text)]"
                    placeholder="0"
                  />
                </label>
              </div>
            ) : null}
            {quickSuggestions.length > 0 && !depositMode ? (
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
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
            <OrderPaymentModalAccountingUpload
              orderId={orderId}
              onSaved={() => router.refresh()}
            />
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
                disabled={
                  busy ||
                  (depositMode
                    ? !depositParty ||
                      !depositAmount.trim() ||
                      (depositParty === "CLINIC" && !clinicId) ||
                      (depositParty === "DOCTOR" && !doctorId)
                    : !newLabel.trim())
                }
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-base font-medium text-white hover:opacity-95 disabled:opacity-50"
                onClick={() => {
                  if (depositMode) {
                    void (async () => {
                      const amountRub = Math.round(
                        Number(String(depositAmount).replace(",", ".")),
                      );
                      if (!depositParty || !Number.isFinite(amountRub) || amountRub <= 0) {
                        setErr("Укажите сторону и сумму больше 0");
                        return;
                      }
                      const path =
                        depositParty === "CLINIC"
                          ? `/api/clinics/${clinicId}/deposit`
                          : `/api/doctors/${doctorId}/deposit`;
                      setBusy(true);
                      setErr(null);
                      try {
                        const res = await fetch(path, {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            amountRub,
                            kind: "TOPUP",
                            note: `Переплата из наряда ${orderId}`,
                          }),
                        });
                        const j = (await res.json().catch(() => ({}))) as {
                          error?: string;
                        };
                        if (!res.ok) {
                          setErr(j.error ?? "Не удалось внести депозит");
                          return;
                        }
                        closeAdd();
                        router.refresh();
                      } catch {
                        setErr("Сеть недоступна");
                      } finally {
                        setBusy(false);
                      }
                    })();
                    return;
                  }
                  void submitAdd(undefined);
                }}
              >
                {busy ? "…" : "Добавить"}
              </button>
            </div>
        </>
      ), "w-full max-w-md")}

      {renderTagsOverlay(urgentOpen, "Срочность", closeUrgent, (
        <>
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
                onClick={closeUrgent}
              >
                Закрыть
              </button>
            </div>
        </>
      ))}

      {renderTagsOverlay(
        paymentOpen,
        "Статус оплаты",
        closePayment,
        (
          <>
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
                onClick={closePayment}
              >
                Закрыть
              </button>
            </div>
          </>
        ),
        "w-full max-w-md",
      )}
    </Fragment>
  );
}
