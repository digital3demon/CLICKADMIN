"use client";

import Link from "next/link";
import { OrderNarjadPrintTrigger } from "@/components/orders/OrderNarjadPrintTrigger";
import { OrderCorrectionDetails } from "@/components/orders/OrderCorrectionDetails";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { UserRole } from "@prisma/client";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { cleanLegalFullName } from "@/lib/document-workflow-markers";
import {
  isoToDatetimeLocal,
  localDateTimeToIso,
} from "@/lib/datetime-local";
import { useAutosizeTextarea } from "@/lib/use-autosize-textarea";
import {
  autoLabDueLocalFromLeadWorkingDays,
  clampDueLocalToMin,
  clampLabDueLocalToMin,
  DUE_DAY_DEFAULT_HM,
  earliestDueGridLocalFromCreatedAt,
  earliestLabDueGridLocalFromCreatedAt,
  parseHmFromDueGridLocal,
  snapDatetimeLocalToDueGrid,
  snapDatetimeLocalToLabDueGrid,
} from "@/lib/order-due-datetime";
import {
  appointmentCompactTimeLabel,
  appointmentHasTimeFlag,
  appointmentHmForMode,
  appointmentTimeModeFromLocal,
  replaceAppointmentLocalHm,
  type AppointmentTimeMode,
} from "@/lib/appointment-time-mode";
import { DueDatetimeComboPicker } from "@/components/ui/DueDatetimeComboPicker";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import {
  clinicComboboxSearchPrefixes,
  doctorComboboxSearchPrefixes,
  clinicSelectLabel,
  orderDoctorsForClinicCombobox,
  ORDER_CLINIC_PRIVATE,
} from "@/lib/clients-order-ui";
import {
  canonicalOrderPayment,
  legalEntitySelectFromClinicBilling,
  isReconciliationPaymentStatus,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PAID,
  ORDER_PAYMENT_PARTIAL,
  ORDER_PAYMENT_RECON_PAID,
  ORDER_PAYMENT_RECON_UNPAID,
  sverkaPaymentSelectLabel,
  withExtraSelectOption,
} from "@/lib/order-clinic-client-fields";
import {
  orderPriceListFieldDisplayLabel,
  resolvedOrderPriceListKindFromContractors,
} from "@/lib/order-price-list-from-contractors";
import {
  lineNetAfterLineDiscountRub,
  orderCompositionSubtotalAfterDiscountsRub,
  orderPayableAfterDepositRub,
  parseDraftDiscountPercentString,
} from "@/lib/format-order-construction";
import { depositPartyForOrder } from "@/lib/deposit-ledger";
import {
  normalizeLegacyLabWorkStatus,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import { KaitenHeaderPillMenu } from "@/components/orders/KaitenHeaderPillMenu";
import { UrgentPillMenu } from "@/components/orders/UrgentPillMenu";
import { OrderHeadlinePills } from "@/components/orders/OrderHeadlinePills";
import { OrderDocumentMailPanel } from "@/components/orders/OrderDocumentMailPanel";
import {
  orderUrgentPriceMultiplier,
  parseUrgentSelection,
  URGENT_MENU_OPTIONS,
  urgentSelectionFromOrder,
} from "@/lib/order-urgency";
import { OrderFilesPanel } from "@/components/orders/OrderFilesPanel";
import { OrderRevisionHistory } from "@/components/orders/OrderRevisionHistory";
import {
  constructionsToDraft,
  draftToConstructionPayload,
  OrderConstructionsEditor,
  type DraftConstructionLine,
} from "@/components/orders/OrderConstructionsEditor";
import { OrderProstheticsBlock } from "@/components/orders/OrderProstheticsBlock";
import { OrderKaitenQrModal } from "@/components/orders/OrderKaitenQrModal";
import { OrderSourceEmailsModal } from "@/components/orders/OrderSourceEmailsModal";
import { IconMail } from "@/components/kanban/kanban-icons";
import { OrderPaymentSlipsBlock } from "@/components/orders/OrderPaymentSlipsBlock";
import { PrefixSearchCombobox } from "@/components/ui/PrefixSearchCombobox";
import { MobileAwareDialog } from "@/components/ui/MobileAwareDialog";
import { Spinner } from "@/components/ui/Spinner";
import {
  invoiceMismatchFingerprintFor,
  orderInvoiceCompositionMismatch,
} from "@/lib/order-invoice-composition-mismatch";
import type { OrderProstheticsV1 } from "@/lib/order-prosthetics";
import type { KaitenTrackLane, OrderCorrectionTrack } from "@prisma/client";
import { OrderKaitenTab } from "@/components/orders/OrderKaitenTab";
import { OrderChatCorrectionsPanel } from "@/components/orders/OrderChatCorrectionsPanel";
import { OrderProstheticsRequestsPanel } from "@/components/orders/OrderProstheticsRequestsPanel";
import { OrderDemoKanbanTab } from "@/components/orders/OrderDemoKanbanTab";
import {
  ORDER_CORRECTION_TRACK_LABELS,
  ORDER_CORRECTION_TRACK_VALUES,
} from "@/lib/order-correction-track";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { toast } from "@/components/ui/toast-store";
import {
  OrderEditCustomizeToggle,
  OrderEditPageLayoutGrid,
} from "@/components/orders/OrderEditPageLayoutGrid";
import {
  clearOrderEditLayout,
  defaultOrderEditLayout,
  loadOrderEditLayout,
  type OrderEditLayoutV1,
  saveOrderEditLayout,
} from "@/lib/order-edit-layout-prefs";
import {
  deleteClientState,
  readClientState,
  writeClientState,
} from "@/lib/client-state-client";
import {
  formatInvoiceParsedLinesAsText,
  normalizeInvoiceParsedLines,
} from "@/lib/invoice-parsed-types";
import {
  formatInvoiceTotalRubRuDisplay,
  formatInvoiceTotalRubRuDisplayNullable,
  parseInvoiceTotalRubRuInput,
} from "@/lib/format-invoice-total-rub-display";
import { CRM_ORDER_ARCHIVED_EVENT } from "@/lib/crm-client-events";
import {
  CRM_UPLOAD_MAX_BYTES,
  formatCrmUploadMaxShortRu,
} from "@/lib/crm-upload-limits";
import { postOrderAttachmentWithRetries } from "@/lib/order-attachment-upload-client";
import { CORRECTION_PRICE_ITEM_CODE } from "@/lib/pricing/correction-price-item";
import { fetchCorrectionPriceListMeta } from "@/lib/pricing/fetch-correction-price-list-meta";
import { normalizeProductionCalendarCountry } from "@/lib/production-calendar";
import { orderPathById } from "@/lib/order-public-ref";
import {
  ContinueWorkSearchDialog,
  type PickedOrder,
} from "@/components/orders/new-order-form/ContinueWorkSearchDialog";

type CourierOption = { id: string; name: string };

function MobileCollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (min-height: 560px)");
    const syncOpen = () => {
      const details = detailsRef.current;
      if (!details) return;
      details.open = mq.matches || defaultOpen;
    };
    syncOpen();
    mq.addEventListener("change", syncOpen);
    return () => mq.removeEventListener("change", syncOpen);
  }, [defaultOpen]);

  return (
    <details ref={detailsRef} className="group shell-laptop:contents">
      <summary className="mb-2 flex cursor-pointer select-none list-none items-center justify-between rounded-lg bg-[var(--surface-subtle)] px-3 py-2.5 shell-laptop:hidden [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-medium text-[var(--text-strong)]">
          {title}
        </span>
        <span className="text-[var(--text-muted)] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      {children}
    </details>
  );
}

function formatDocumentFlowCompositionLineText(line: {
  title: string;
  quantity: number;
  amountRub: number;
}): string {
  return `${line.title}\n${line.quantity}\n${moneyRu(line.amountRub)}`;
}

function formatDocumentFlowCompositionAllText(
  lines: Array<{ title: string; quantity: number; amountRub: number }>,
): string {
  return lines.map(formatDocumentFlowCompositionLineText).join("\n");
}

/** Состав наряда на вкладке «Документооборот»: свёрнут; длинный список скроллится в своей колонке. */
function DocumentFlowCompositionSpoiler({
  lines,
  onCopy,
}: {
  lines: Array<{ title: string; quantity: number; amountRub: number }>;
  onCopy: (text: string) => void;
}) {
  const allText = formatDocumentFlowCompositionAllText(lines);
  return (
    <details className="group w-fit max-w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1.5 select-none hover:brightness-105 [&::-webkit-details-marker]:hidden">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Состав заказа
          {lines.length > 0 ? ` · ${lines.length}` : ""}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={lines.length === 0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (allText) onCopy(allText);
            }}
            title="Скопировать весь состав построчно"
            className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-strong)] shadow-sm hover:border-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)] disabled:cursor-default disabled:opacity-50"
          >
            Скопировать все
          </button>
          <span
            aria-hidden
            className="text-[var(--text-muted)] transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="max-h-40 overflow-y-auto border-t border-[var(--card-border)] px-2.5 py-2">
        {lines.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Нет позиций в составе</p>
        ) : (
          <ul className="space-y-2">
            {lines.map((line, idx) => {
              const sumValue = moneyRu(line.amountRub);
              return (
                <li
                  key={`${line.title}-${idx}`}
                  className="flex w-fit max-w-full flex-nowrap items-center gap-2 overflow-x-auto"
                >
                  <button
                    type="button"
                    title="Нажмите — скопировать в буфер обмена"
                    onClick={() => onCopy(line.title)}
                    className="w-fit max-w-[18rem] shrink-0 truncate rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-left font-mono text-xs font-semibold text-[var(--text-strong)] shadow-sm outline-none hover:border-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)] focus-visible:ring-1 focus-visible:ring-sky-500 sm:max-w-[22rem] sm:text-sm"
                  >
                    {line.title}
                  </button>
                  <InvoiceCopyChip
                    label="Кол-во"
                    value={String(line.quantity)}
                    onCopy={onCopy}
                  />
                  <InvoiceCopyChip
                    label="Сумма"
                    value={sumValue}
                    onCopy={onCopy}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}

/** Спойлер вкладок документооборота / канбана / истории — свёрнут и на десктопе. */
function OrderSecondaryTabsSpoiler({
  title,
  children,
  defaultOpen = false,
  highlight = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={[
        "group min-w-0 overflow-hidden rounded-lg bg-[var(--card-bg)] open:shadow-sm",
        highlight
          ? "border-2 border-amber-400/90 ring-2 ring-amber-400/70 dark:border-amber-400/80 dark:ring-amber-400/50"
          : "border border-[var(--card-border)]",
      ].join(" ")}
      open={open}
      onToggle={(e) => {
        setOpen((e.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-[var(--surface-hover)] px-3 py-2.5 select-none hover:brightness-105 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-[var(--text-strong)]">
          {title}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="min-w-0 border-t border-[var(--card-border)] px-3 py-3">
        {children}
      </div>
    </details>
  );
}

/** Лимит ожидания ответа при больших PDF и сетевых задержках (лимит файла до 1 ГБ). */
const INVOICE_UPLOAD_CLIENT_TIMEOUT_MS = 300_000;

type InvoiceAttachmentUploadOk = {
  id: string;
  fileName: string;
  size: number;
  createdAt?: string;
  uploadedToKaitenAt: string | null;
  invoiceNumber?: string | null;
  invoiceIssued?: boolean;
  updNumber?: string | null;
  warning?: string;
};

/** Компактная зона: файл счёта в наряд (вложения), перетаскивание / выбор / Ctrl+V при фокусе. */
function OrderInvoiceFileDrop({
  orderId,
  onDone,
  onFail,
  className,
  disabled = false,
  asUpd = false,
}: {
  orderId: string;
  onDone: (result?: InvoiceAttachmentUploadOk) => void | Promise<void>;
  onFail: (msg: string) => void;
  /** Доп. классы корневого блока (например ширина на вкладке). */
  className?: string;
  /** Вне `<form>`: не наследует `disabled` от `fieldset`, передавать явно. */
  disabled?: boolean;
  asUpd?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  /** Сообщение прямо под зоной загрузки (ошибка «в шапке» формы легко не заметить). */
  const [localHint, setLocalHint] = useState<string | null>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return;
      const arr = Array.from(files).filter(
        (f) => f.size > 0 && f.size <= CRM_UPLOAD_MAX_BYTES,
      );
      if (arr.length === 0) {
        const msg = `Нет подходящего файла (макс. ${formatCrmUploadMaxShortRu()})`;
        setLocalHint(msg);
        onFail(msg);
        return;
      }
      setBusy(true);
      const ctrl = new AbortController();
      const timer = setTimeout(
        () => ctrl.abort(),
        INVOICE_UPLOAD_CLIENT_TIMEOUT_MS,
      );
      try {
        let lastOk: InvoiceAttachmentUploadOk | undefined;
        for (let fi = 0; fi < arr.length; fi++) {
          const file = arr[fi]!;
          if (fi > 0) {
            await new Promise((r) => setTimeout(r, 70));
          }
          setLocalHint("Загрузка и сохранение на сервере…");
          const result = await postOrderAttachmentWithRetries(orderId, file, {
            asInvoice: !asUpd,
            asUpd,
            signal: ctrl.signal,
          });
          if (!result.ok) {
            throw new Error(result.error);
          }
          const j = result.data as {
            error?: string;
            details?: string;
            id?: string;
          } & Partial<InvoiceAttachmentUploadOk>;
          if (!j.id || typeof j.id !== "string") {
            throw new Error(
              "Сервер вернул ответ без id вложения — обновите страницу и попробуйте снова",
            );
          }
          lastOk = { ...(j as InvoiceAttachmentUploadOk), id: j.id };
          if (result.warning?.trim()) {
            lastOk = { ...lastOk, warning: result.warning.trim() };
          }
        }
        setLocalHint("Счёт сохранён. Разбор PDF…");
        await Promise.resolve(onDone(lastOk));
        setLocalHint("Счёт сохранён.");
      } catch (e) {
        const aborted =
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError");
        const msg = aborted
          ? "Сервер не ответил вовремя. Попробуйте снова."
          : e instanceof Error
            ? e.message
            : "Ошибка загрузки";
        setLocalHint(msg);
        onFail(msg);
      } finally {
        clearTimeout(timer);
        setBusy(false);
      }
    },
    [orderId, onDone, onFail, disabled, asUpd],
  );

  return (
    <div className="min-w-0 space-y-1.5">
    <div
      ref={zoneRef}
      tabIndex={disabled ? -1 : 0}
      role="group"
      aria-label="Загрузка файла счёта"
      title={
        disabled
          ? "Нет права на изменение данных клиентов"
          : "Перетащите PDF на зону; при наведении — Ctrl+V; клик — выбор файла"
      }
      onMouseEnter={() => {
        if (disabled || busy) return;
        zoneRef.current?.focus({ preventScroll: true });
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onPaste={(e) => {
        if (disabled) return;
        const fl = e.clipboardData?.files;
        if (fl?.length) {
          e.preventDefault();
          void upload(fl);
        }
      }}
      onDragEnter={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current += 1;
        if (e.dataTransfer?.types.includes("Files")) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragOver(false);
      }}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current = 0;
        setDragOver(false);
        const fl = e.dataTransfer?.files;
        if (fl?.length) void upload(fl);
      }}
      onClick={() => {
        if (disabled || busy) return;
        inputRef.current?.click();
      }}
      className={[
        disabled ? "pointer-events-none cursor-not-allowed opacity-50" : null,
        dragOver
          ? "border-[var(--sidebar-blue)] bg-sky-50/80 text-[var(--sidebar-blue)] dark:bg-sky-950/40"
          : null,
        className ??
          "max-w-[11rem] cursor-pointer rounded-md border border-dashed border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-center text-[10px] font-medium leading-snug text-[var(--text-secondary)] shadow-sm outline-none transition-colors hover:border-[var(--sidebar-blue)] hover:text-[var(--text-strong)] focus-visible:ring-1 focus-visible:ring-sky-500 sm:max-w-[13rem] sm:text-xs",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(ev) => {
          const fl = ev.target.files;
          ev.target.value = "";
          if (fl?.length) void upload(fl);
        }}
      />
      {busy
        ? "Загрузка…"
        : dragOver
          ? "Отпустите файл"
          : "Файл счёта · ↓ или Ctrl+V"}
    </div>
      {localHint ? (
        <p
          className={
            localHint.startsWith("Счёт сохранён")
              ? "text-xs font-medium text-emerald-800 dark:text-emerald-200"
              : "text-xs font-medium text-red-700 dark:text-red-300"
          }
          role={localHint.startsWith("Счёт сохранён") ? "status" : "alert"}
        >
          {localHint}
        </p>
      ) : null}
    </div>
  );
}

const LEGAL_ENTITIES = [
  "Выбрать из списка",
  "Частное лицо",
  "ИП",
  "ООО",
] as const;

/** Без плейсхолдера: три обычных статуса + два пункта для сверочных клиник. */
const PAYMENT_OPTIONS = [
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PARTIAL,
  ORDER_PAYMENT_PAID,
  ORDER_PAYMENT_RECON_UNPAID,
  ORDER_PAYMENT_RECON_PAID,
] as const;

function formatCreatedAtRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Одна строка как у `DueDatetimeComboPicker` с `labelPlacement="inside"`. */
function EditFormInlineLabeledRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-10 min-w-0 w-full max-w-full items-stretch gap-0 overflow-hidden rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] shadow-sm">
      <span className="flex max-w-[6.25rem] shrink-0 flex-col justify-center border-r border-[var(--input-border)] bg-[var(--surface-subtle)] px-2 py-0.5 text-center text-[8px] font-bold uppercase leading-tight tracking-wide text-[var(--text-muted)] sm:max-w-[7rem] sm:text-[9px]">
        {label}
      </span>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
        {children}
      </div>
    </div>
  );
}

const invoiceCopyChipClass =
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-left shadow-sm outline-none hover:border-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)] focus-visible:ring-1 focus-visible:ring-sky-500 disabled:cursor-default disabled:hover:border-[var(--input-border)] disabled:hover:bg-[var(--card-bg)]";

function InvoiceCopyChip({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string | null;
  onCopy: (text: string) => void;
}) {
  const text = (value ?? "").trim();
  const empty = !text;
  return (
    <button
      type="button"
      disabled={empty}
      onClick={() => {
        if (!empty) onCopy(text);
      }}
      title={
        empty
          ? `${label} не указано в карточке клиента`
          : "Нажмите — скопировать в буфер обмена"
      }
      className={invoiceCopyChipClass}
    >
      <span className="shrink-0 text-[8px] font-bold uppercase leading-tight tracking-wide text-[var(--text-muted)] sm:text-[9px]">
        {label}
      </span>
      <span
        className={`min-w-0 truncate font-mono text-xs font-semibold sm:text-sm ${
          empty ? "text-[var(--text-muted)]" : "text-[var(--text-strong)]"
        }`}
      >
        {empty ? "—" : text}
      </span>
    </button>
  );
}

type DoctorRow = {
  id: string;
  fullName: string;
  isIpEntrepreneur?: boolean;
  ipClinicId?: string | null;
  orderPriceListKind?: "MAIN" | "CUSTOM" | null;
};
type ClinicRow = {
  id: string;
  name: string;
  address?: string | null;
  isActive?: boolean;
  legalFullName?: string | null;
  inn?: string | null;
  billingLegalForm?: "IP" | "OOO" | null;
  orderPriceListKind?: "MAIN" | "CUSTOM" | null;
  worksWithReconciliation?: boolean;
  reconciliationFrequency?: "MONTHLY_1" | "MONTHLY_2" | null;
  sourceDoctorId?: string | null;
  doctors: DoctorRow[];
};

const inputClass =
  "mt-0.5 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-base text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:text-sm";
const comboboxClass = `${inputClass} cursor-text`;
const labelClass = "block text-sm font-medium leading-none text-[var(--text-body)]";
const labelInlineClass =
  "text-sm font-medium leading-none text-[var(--text-body)]";
const labelRowClass =
  "mb-0 flex min-h-[1.25rem] items-center gap-x-2";
const editChangeBtnClass =
  "shrink-0 text-xs font-medium leading-none text-[var(--text-muted)] underline decoration-[var(--text-muted)]/45 underline-offset-2 hover:text-[var(--text-secondary)] hover:no-underline";
const checkboxLabelClassEdit =
  "flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-strong)] select-none sm:text-sm";
const checkboxInputClassEdit =
  "h-3.5 w-3.5 shrink-0 rounded border-[var(--input-border)] text-[var(--sidebar-blue)] focus:ring-sky-500";
/** Колонка сетки наряда (как секции в «Новом заказе», без «плавающего» центрирования). */
const editColWrap =
  "min-w-0 space-y-0 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 sm:p-3.5";
/** То же для верхней четырёхколоночной сетки: выравнивание по высоте строки. */
const editMainCol = `${editColWrap} flex min-h-0 flex-col xl:h-full`;
/** Заказ от клиента / комментарий от админов: без xl:h-full — иначе колонка тянется за соседями и авт высота textarea ломается. */
const editNotesCol = `${editColWrap} flex min-h-0 w-full flex-col`;
const editClientOrderMaxHeight = 240;
const editNotesMaxHeight = 160;

function moneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

export type OrderEditInitial = {
  id: string;
  orderNumber: string;
  clinicId: string | null;
  doctorId: string;
  patientName: string | null;
  notes: string | null;
  clientOrderText: string | null;
  labWorkStatus: LabWorkStatus;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  dueDate: string | null;
  dueToAdminsAt: string | null;
  /** false — срок лабораторный без времени (Кайтен / шапка) */
  kaitenAdminDueHasTime: boolean;
  /** false — запись «в течение дня» */
  dueToAdminsHasTime: boolean;
  /** Когда зашла работа (поступление); null — как при создании без явной даты */
  workReceivedAt: string | null;
  createdAt: string;
  /** HH:mm для «Срок лабораторный» (конфигурация «Канбан и ERP»). */
  labDueHmSlots: string[];
  /** Страна производственного календаря для автосрока по прайсу. */
  productionCalendarCountry?: string;
  invoiceIssued: boolean;
  invoiceNumber: string | null;
  invoicePaperDocs: boolean;
  invoiceSentToEdo: boolean;
  invoiceEdoSigned: boolean;
  invoicePrinted: boolean;
  updNumber: string | null;
  updPrinted: boolean;
  updAttachmentId: string | null;
  narjadPrinted: boolean;
  adminShippedOtpr: boolean;
  /** Текст «что отгружено» при отметке отправки */
  shippedDescription: string | null;
  invoiceParsedLines: unknown;
  invoiceParsedTotalRub: number | null;
  /** Подтверждённая пара сумм «счёт:состав»; пока та же — рамка не светится. */
  invoiceMismatchAckFingerprint: string | null;
  invoiceParsedSummaryText: string | null;
  invoicePaymentNotes: string | null;
  orderPriceListKind: "MAIN" | "CUSTOM" | null;
  /** Активный каталог прайса (название в конфигурации) — для подписи, когда у контрагентов не задан индивидуальный прайс */
  workspaceActivePriceListName: string | null;
  orderPriceListNote: string | null;
  prostheticsOrdered: boolean;
  correctionTrack: OrderCorrectionTrack | null;
  correctionReason: string | null;
  correctionPaid: boolean;
  registeredByLabel: string | null;
  courierId: string | null;
  courierName: string | null;
  courierPickupId: string | null;
  courierPickupName: string | null;
  courierDeliveryId: string | null;
  courierDeliveryName: string | null;
  legalEntity: string | null;
  payment: string | null;
  paymentPartialRub: number | null;
  excludeFromReconciliation: boolean;
  excludeFromReconciliationUntil: string | null;
  hasScans: boolean;
  hasCt: boolean;
  hasMri: boolean;
  hasPhoto: boolean;
  additionalSourceNotes: string | null;
  constructions: Array<{
    category: string;
    constructionTypeId: string | null;
    priceListItemId: string | null;
    priceListItem?: {
      id: string;
      code: string;
      name: string;
      priceRub: number;
      leadWorkingDays?: number | null;
      variablePrice?: boolean;
    } | null;
    materialId: string | null;
    shade: string | null;
    quantity: number;
    unitPrice: number | null;
    lineDiscountPercent?: number | null;
    teethFdi: unknown;
    bridgeFromFdi: string | null;
    bridgeToFdi: string | null;
    arch: string | null;
  }>;
  /** Общая скидка на «Состав заказа», % */
  compositionDiscountPercent: number;
  /** Учтённый депозит в наряде (руб.) */
  depositAppliedRub: number | null;
  depositAppliedParty: "CLINIC" | "DOCTOR" | null;
  /** Баланс депозита релевантной стороны (клиника или врач) */
  depositBalanceRub: number;
  depositClinicName?: string | null;
  depositClinicSourceDoctorId?: string | null;
  depositClinicBalanceRub?: number;
  depositDoctorBalanceRub?: number;
  /** ФинОтдел: состав заказа проверен и просчитан */
  financeCalculated: boolean;
  prosthetics: OrderProstheticsV1;
  kaitenCardId: number | null;
  /** Вид работы в шапке Kaiten (между врачом и сроком) */
  kaitenCardTitleLabel?: string | null;
  /** «Настроить Kaiten позже» при создании */
  kaitenDecideLater?: boolean;
  /** Текст ошибки последней выгрузки / создания в Kaiten */
  kaitenSyncError?: string | null;
  kaitenCardTypeId?: string | null;
  kaitenCardTypeName?: string | null;
  demoKanbanColumn?: string | null;
  /** Подпись колонки доски Kaiten (кэш в CRM) */
  kaitenColumnTitle: string | null;
  /** Ссылка на карточку Kaiten (сервер строит из env); null если не настроено */
  kaitenCardUrl: string | null;
  /** Пространство (дорожка CRM), привязанное к доске Kaiten */
  kaitenTrackLane: KaitenTrackLane | null;
  /** Кэш блокировки карточки Kaiten (обновляется вкладкой «Кайтен» и фоновым опросом списка) */
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  /** Загруженный файл счёта; без него «Скачать счёт» недоступен */
  invoiceAttachmentId: string | null;
  /** Время загрузки файла счёта (для подписи «Загружено …») */
  invoiceAttachmentCreatedAt: string | null;
  /** Отмечен при создании как продолжение отгруженного наряда */
  continuesFromOrder: { id: string; orderNumber: string } | null;
  continuationFollowups: { id: string; orderNumber: string }[];
  /** Корректировки из чата (префикс «!!!») */
  chatCorrections: Array<{
    id: string;
    text: string;
    source: "KAITEN" | "DEMO_KANBAN";
    authorLabel: string | null;
    createdAt: string;
    resolvedAt: string | null;
    rejectedAt: string | null;
  }>;
  /** Заявки по протетике из чата (префикс «???») */
  prostheticsRequests: Array<{
    id: string;
    text: string;
    source: "KAITEN" | "DEMO_KANBAN";
    authorLabel: string | null;
    createdAt: string;
    resolvedAt: string | null;
    rejectedAt: string | null;
    arrivedAt: string | null;
  }>;
  /** Сколько писем привязано к наряду (кнопка почты в шапке) */
  sourceEmailCount: number;
};

/** Вкладки документооборота / Канбан-Кайтен / истории (на странице наряда — над нижней панелью). */
const SECONDARY_TABS = ["Документооборот", "Канбан/Кайтен", "История"] as const;
export type OrderEditTab = (typeof SECONDARY_TABS)[number];
type EditTab = OrderEditTab;

function normalizeSecondaryTab(t: EditTab | undefined): EditTab {
  if (t === "Канбан/Кайтен" || t === "История" || t === "Документооборот") return t;
  return "Документооборот";
}

export function OrderEditForm({
  initial,
  initialActiveTab,
  isDemoMode = false,
  demoKanbanCardTypes = [],
  canAcceptChatCorrections = false,
  canEditClients = true,
  canEditOrder = true,
  previewMode = false,
  virtualSuggestedAttachments = [],
  viewerRole = null,
  kanbanCardUrl = null,
  kaitenIntegrationActive = true,
  orderPageFrame,
}: {
  initial: OrderEditInitial;
  initialActiveTab?: EditTab;
  isDemoMode?: boolean;
  /** false — CRM/канбан без внешней синхронизации Kaiten. */
  kaitenIntegrationActive?: boolean;
  demoKanbanCardTypes?: Array<{ id: string; name: string }>;
  /** Принять корректировки из чата (роль админ / ст. админ / фин. менеджер). */
  canAcceptChatCorrections?: boolean;
  /** Правка счёта и клиентских полей на вкладке документооборота наряда. */
  canEditClients?: boolean;
  /** Сохранение полей наряда (модуль «Редактирование заказа»). */
  canEditOrder?: boolean;
  /** Виртуальный наряд ИИ в Diff Viewer — без сохранения и без API файлов. */
  previewMode?: boolean;
  virtualSuggestedAttachments?: Array<{ fileName: string; mimeType?: string }>;
  /** Роль текущего пользователя (для раскладки «строка в буфер» на вкладке счёта). */
  viewerRole?: UserRole | null;
  kanbanCardUrl?: string | null;
  /** Шапка модуля: этап работы, срочность, пилюли-индикаторы. «Сохранить» — в тулбаре наряда. */
  orderPageFrame?: {
    title: string;
    /** Необязательный серый текст под заголовком (обычно не показываем). */
    description?: string;
  };
}) {
  const isOrderPageFramed = orderPageFrame != null;
  const showKaitenExternalUi = kaitenIntegrationActive && !isDemoMode;
  const kanbanTabLabel = showKaitenExternalUi ? "Канбан/Кайтен" : "Канбан";
  const isAccountant = viewerRole === "ACCOUNTANT";
  const isHarmony = useUiDesign() === "harmony";
  const router = useRouter();
  const { user: sessionUser } = useSessionUser();
  const sessionUserId = sessionUser?.id ?? null;
  const [activeTab, setActiveTab] = useState<EditTab>(() =>
    normalizeSecondaryTab(initialActiveTab),
  );

  useEffect(() => {
    setActiveTab(normalizeSecondaryTab(initialActiveTab));
  }, [initialActiveTab]);

  useEffect(() => {
    setOrderNumberDraft(initial.orderNumber);
  }, [initial.id, initial.orderNumber]);

  const [kaitenNewOrderWarn, setKaitenNewOrderWarn] = useState<string | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const kKaiten = `kaitenNewOrderWarn:${initial.id}`;
      const kFiles = `orderAttachmentsWarn:${initial.id}`;
      const [tKaiten, tFiles] = await Promise.all([
        readClientState<unknown>("user", kKaiten),
        readClientState<unknown>("user", kFiles),
      ]);
      if (cancelled) return;
      const parts: string[] = [];
      if (typeof tKaiten === "string" && tKaiten.trim()) {
        parts.push(tKaiten.trim());
        await deleteClientState("user", kKaiten);
      }
      if (typeof tFiles === "string" && tFiles.trim()) {
        parts.push(
          `Не все файлы из черновика прикрепились после сохранения:\n${tFiles.trim()}`,
        );
        await deleteClientState("user", kFiles);
      }
      if (parts.length > 0) {
        setKaitenNewOrderWarn(parts.join("\n\n"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial.id]);

  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [privatePracticeDoctors, setPrivatePracticeDoctors] = useState<
    DoctorRow[]
  >([]);
  const [allDoctors, setAllDoctors] = useState<DoctorRow[]>([]);
  const [loadClinicsError, setLoadClinicsError] = useState<string | null>(null);

  const [clinicId, setClinicId] = useState<string>(() =>
    initial.clinicId ?? ORDER_CLINIC_PRIVATE,
  );
  const [doctorId, setDoctorId] = useState(initial.doctorId);
  const [patientName, setPatientName] = useState(initial.patientName ?? "");
  const [continuesFromOrderId, setContinuesFromOrderId] = useState<string | null>(
    () => initial.continuesFromOrder?.id ?? null,
  );
  const [continuesFromOrderNumber, setContinuesFromOrderNumber] = useState<
    string | null
  >(() => initial.continuesFromOrder?.orderNumber ?? null);
  const [continuationSearchOpen, setContinuationSearchOpen] = useState(false);

  useEffect(() => {
    setContinuesFromOrderId(initial.continuesFromOrder?.id ?? null);
    setContinuesFromOrderNumber(initial.continuesFromOrder?.orderNumber ?? null);
  }, [
    initial.id,
    initial.continuesFromOrder?.id,
    initial.continuesFromOrder?.orderNumber,
  ]);
  /** По умолчанию поля заказчика заблокированы — снимается кнопкой «Изменить». */
  const [customerEditClinic, setCustomerEditClinic] = useState(false);
  const [customerEditDoctor, setCustomerEditDoctor] = useState(false);
  const [customerEditPatient, setCustomerEditPatient] = useState(false);

  useEffect(() => {
    setCustomerEditClinic(false);
    setCustomerEditDoctor(false);
    setCustomerEditPatient(false);
  }, [
    initial.id,
    initial.clinicId,
    initial.doctorId,
    initial.patientName,
  ]);

  const [notes, setNotes] = useState(initial.notes ?? "");
  const [clientOrderText, setClientOrderText] = useState(
    initial.clientOrderText ?? "",
  );
  const clientOrderTextareaRef = useAutosizeTextarea(clientOrderText, {
    maxHeight: editClientOrderMaxHeight,
  });
  const notesTextareaRef = useAutosizeTextarea(notes, {
    maxHeight: editNotesMaxHeight,
  });
  const [labWorkStatus, setLabWorkStatus] = useState<LabWorkStatus>(() =>
    normalizeLegacyLabWorkStatus(String(initial.labWorkStatus)),
  );
  const [urgentSelection, setUrgentSelection] = useState(() =>
    urgentSelectionFromOrder(initial.isUrgent, initial.urgentCoefficient),
  );

  const urgentPriceMult = useMemo(() => {
    try {
      const u = parseUrgentSelection(urgentSelection);
      return orderUrgentPriceMultiplier(u.isUrgent, u.urgentCoefficient);
    } catch {
      return 1;
    }
  }, [urgentSelection]);

  const dueDateMinLocal = useMemo(
    () => earliestDueGridLocalFromCreatedAt(initial.createdAt),
    [initial.createdAt],
  );

  const dueLabMinLocal = useMemo(
    () =>
      earliestLabDueGridLocalFromCreatedAt(
        initial.createdAt,
        initial.labDueHmSlots,
      ),
    [initial.createdAt, initial.labDueHmSlots],
  );

  const [dueLocal, setDueLocal] = useState(() => {
    const slots = initial.labDueHmSlots;
    const minLab = earliestLabDueGridLocalFromCreatedAt(
      initial.createdAt,
      slots,
    );
    const raw = snapDatetimeLocalToLabDueGrid(
      isoToDatetimeLocal(initial.dueDate),
      slots,
    );
    if (!raw) return "";
    return clampLabDueLocalToMin(raw, minLab, slots);
  });
  const [dueAdminsLocal, setDueAdminsLocal] = useState(() => {
    const raw = snapDatetimeLocalToDueGrid(
      isoToDatetimeLocal(initial.dueToAdminsAt),
    );
    if (!raw) return "";
    return clampDueLocalToMin(raw, dueDateMinLocal);
  });
  const [labWholeDay, setLabWholeDay] = useState(
    () => initial.kaitenAdminDueHasTime === false,
  );
  const [appointmentMode, setAppointmentMode] = useState<AppointmentTimeMode>(
    () =>
      appointmentTimeModeFromLocal(
        initial.dueToAdminsHasTime !== false,
        snapDatetimeLocalToDueGrid(isoToDatetimeLocal(initial.dueToAdminsAt)),
      ),
  );

  useEffect(() => {
    const minHalf = earliestDueGridLocalFromCreatedAt(initial.createdAt);
    const slots = initial.labDueHmSlots;
    const minLab = earliestLabDueGridLocalFromCreatedAt(
      initial.createdAt,
      slots,
    );
    const rawDue = snapDatetimeLocalToLabDueGrid(
      isoToDatetimeLocal(initial.dueDate),
      slots,
    );
    setDueLocal(
      rawDue ? clampLabDueLocalToMin(rawDue, minLab, slots) : "",
    );
    const rawAdm = snapDatetimeLocalToDueGrid(
      isoToDatetimeLocal(initial.dueToAdminsAt),
    );
    setDueAdminsLocal(rawAdm ? clampDueLocalToMin(rawAdm, minHalf) : "");
    setLabWholeDay(initial.kaitenAdminDueHasTime === false);
    setAppointmentMode(
      appointmentTimeModeFromLocal(
        initial.dueToAdminsHasTime !== false,
        rawAdm,
      ),
    );
    setLabDueAutoByPrice(!Boolean(initial.dueDate));
  }, [
    initial.id,
    initial.createdAt,
    initial.dueDate,
    initial.dueToAdminsAt,
    initial.kaitenAdminDueHasTime,
    initial.dueToAdminsHasTime,
    initial.labDueHmSlots,
  ]);
  const [invoiceIssued, setInvoiceIssued] = useState(initial.invoiceIssued);
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => initial.invoiceNumber ?? "",
  );
  const [invoicePaperDocs, setInvoicePaperDocs] = useState(
    initial.invoicePaperDocs,
  );
  const [invoiceSentToEdo, setInvoiceSentToEdo] = useState(
    initial.invoiceSentToEdo,
  );
  const [invoiceEdoSigned, setInvoiceEdoSigned] = useState(
    initial.invoiceEdoSigned,
  );
  const [invoicePrinted, setInvoicePrinted] = useState(initial.invoicePrinted);
  const [updNumber, setUpdNumber] = useState(() => initial.updNumber ?? "");
  const [updPrinted, setUpdPrinted] = useState(initial.updPrinted);
  const [updAttachmentId, setUpdAttachmentId] = useState<string | null>(
    () => initial.updAttachmentId,
  );
  /** Локально обновляется после загрузки счёта — нельзя полагаться только на router.refresh() и props. */
  const [invoiceAttachmentId, setInvoiceAttachmentId] = useState<
    string | null
  >(() => initial.invoiceAttachmentId);
  const [invoiceDeleting, setInvoiceDeleting] = useState(false);

  useEffect(() => {
    setInvoiceAttachmentId(initial.invoiceAttachmentId);
  }, [initial.id, initial.invoiceAttachmentId]);

  useEffect(() => {
    setInvoicePrinted(initial.invoicePrinted);
  }, [initial.id, initial.invoicePrinted]);

  useEffect(() => {
    setUpdNumber(initial.updNumber ?? "");
    setUpdPrinted(initial.updPrinted);
    setUpdAttachmentId(initial.updAttachmentId);
  }, [initial.id, initial.updNumber, initial.updPrinted, initial.updAttachmentId]);

  useEffect(() => {
    setInvoicePaperDocs(initial.invoicePaperDocs);
    setInvoiceSentToEdo(initial.invoiceSentToEdo);
    setInvoiceEdoSigned(initial.invoiceEdoSigned);
  }, [
    initial.id,
    initial.invoicePaperDocs,
    initial.invoiceSentToEdo,
    initial.invoiceEdoSigned,
  ]);

  useEffect(() => {
    setExcludeFromReconciliation(initial.excludeFromReconciliation === true);
  }, [initial.id, initial.excludeFromReconciliation]);

  useEffect(() => {
    setAdminShippedOtpr(initial.adminShippedOtpr);
    setShippedDescription(initial.shippedDescription ?? "");
    setInvoicePaymentNotes(initial.invoicePaymentNotes ?? "");
  }, [
    initial.id,
    initial.adminShippedOtpr,
    initial.shippedDescription,
    initial.invoicePaymentNotes,
  ]);

  const [narjadPrinted, setNarjadPrinted] = useState(initial.narjadPrinted);
  const [adminShippedOtpr, setAdminShippedOtpr] = useState(
    initial.adminShippedOtpr,
  );
  const [shippedDescription, setShippedDescription] = useState(
    () => initial.shippedDescription ?? "",
  );
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shipModalMode, setShipModalMode] = useState<"mark" | "edit">("mark");
  const [shipModalDraft, setShipModalDraft] = useState("");
  const [orderMailOpen, setOrderMailOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveErr, setArchiveErr] = useState<string | null>(null);
  const [invoicePaymentNotes, setInvoicePaymentNotes] = useState(
    () => initial.invoicePaymentNotes ?? "",
  );
  const [invoiceParsedSummaryText, setInvoiceParsedSummaryText] = useState(
    () => initial.invoiceParsedSummaryText ?? "",
  );
  const [invoiceParsedTotalRubText, setInvoiceParsedTotalRubText] = useState(
    () =>
      formatInvoiceTotalRubRuDisplayNullable(initial.invoiceParsedTotalRub),
  );
  const invoiceParsedTotalRub = useMemo(
    () => parseInvoiceTotalRubRuInput(invoiceParsedTotalRubText),
    [invoiceParsedTotalRubText],
  );
  const [mismatchAckFingerprint, setMismatchAckFingerprint] = useState(
    () => initial.invoiceMismatchAckFingerprint,
  );
  const [mismatchConfirmOpen, setMismatchConfirmOpen] = useState(false);
  const [mismatchAckBusy, setMismatchAckBusy] = useState(false);
  useEffect(() => {
    setMismatchAckFingerprint(initial.invoiceMismatchAckFingerprint);
  }, [initial.id, initial.invoiceMismatchAckFingerprint]);
  /** Последние значения, уже записанные в БД (чтобы не дёргать PATCH лишний раз). */
  const lastPersistedInvoiceParsedRef = useRef<{
    summaryText: string | null;
    totalRub: number | null;
  }>({
    summaryText: (initial.invoiceParsedSummaryText ?? "").trim() || null,
    totalRub: initial.invoiceParsedTotalRub ?? null,
  });
  const invoiceParsedLiveRef = useRef({
    summary: invoiceParsedSummaryText,
    totalText: invoiceParsedTotalRubText,
  });
  invoiceParsedLiveRef.current = {
    summary: invoiceParsedSummaryText,
    totalText: invoiceParsedTotalRubText,
  };

  const invoiceParsedAutosaveTimerRef = useRef<number | null>(null);

  /** Отдельно от отгрузки/платежных полей — иначе любой refresh затирал черновик «Выставлено» до автосохранения. */
  useEffect(() => {
    setInvoiceParsedSummaryText(initial.invoiceParsedSummaryText ?? "");
    setInvoiceParsedTotalRubText(
      formatInvoiceTotalRubRuDisplayNullable(initial.invoiceParsedTotalRub),
    );
    lastPersistedInvoiceParsedRef.current = {
      summaryText: (initial.invoiceParsedSummaryText ?? "").trim() || null,
      totalRub: initial.invoiceParsedTotalRub ?? null,
    };
  }, [
    initial.id,
    initial.invoiceParsedSummaryText,
    initial.invoiceParsedTotalRub,
  ]);

  const [invoiceParseBusy, setInvoiceParseBusy] = useState(false);
  const [invoiceParseHint, setInvoiceParseHint] = useState<string | null>(null);
  const parsedLinesForDisplay = useMemo(
    () => normalizeInvoiceParsedLines(initial.invoiceParsedLines),
    [initial.id, initial.invoiceParsedLines],
  );
  const [prostheticsOrdered, setProstheticsOrdered] = useState(
    initial.prostheticsOrdered,
  );
  const [prostheticsOrderedPersisting, setProstheticsOrderedPersisting] =
    useState(false);

  useEffect(() => {
    setProstheticsOrdered(initial.prostheticsOrdered);
  }, [initial.id, initial.prostheticsOrdered]);

  useEffect(() => {
    setCompositionDiscountPercent(initial.compositionDiscountPercent ?? 0);
  }, [initial.id, initial.compositionDiscountPercent]);

  useEffect(() => {
    setProsthetics(initial.prosthetics);
    setProstheticsOurSaleRub(0);
  }, [initial.id, initial.prosthetics]);
  const [financeCalculated, setFinanceCalculated] = useState(
    initial.financeCalculated === true,
  );
  useEffect(() => {
    setFinanceCalculated(initial.financeCalculated === true);
  }, [initial.id, initial.financeCalculated]);

  const [correctionTrack, setCorrectionTrack] =
    useState<OrderCorrectionTrack | null>(initial.correctionTrack);
  const [correctionReason, setCorrectionReason] = useState(
    () => initial.correctionReason?.trim() ?? "",
  );
  const [correctionPaid, setCorrectionPaid] = useState(
    initial.correctionPaid === true,
  );
  useEffect(() => {
    setCorrectionReason(initial.correctionReason?.trim() ?? "");
    setCorrectionPaid(initial.correctionPaid === true);
  }, [
    initial.id,
    initial.correctionReason,
    initial.correctionPaid,
    initial.correctionTrack,
  ]);
  useEffect(() => {
    if (correctionTrack == null) {
      setCorrectionReason("");
      setCorrectionPaid(false);
    }
  }, [correctionTrack]);
  const [courierPickupId, setCourierPickupId] = useState(() => {
    const p = initial.courierPickupId?.trim();
    if (p) return p;
    const leg = initial.courierId?.trim();
    if (leg && !initial.courierDeliveryId?.trim()) return leg;
    return "";
  });
  const [courierDeliveryId, setCourierDeliveryId] = useState(
    () => initial.courierDeliveryId?.trim() ?? "",
  );
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [legalEntity, setLegalEntity] = useState(
    initial.legalEntity?.trim() || LEGAL_ENTITIES[0],
  );
  const [payment, setPayment] = useState(() =>
    canonicalOrderPayment(initial.payment?.trim() || ORDER_PAYMENT_NOT_PAID),
  );
  const [paymentPartialRubText, setPaymentPartialRubText] = useState(
    initial.paymentPartialRub != null ? String(initial.paymentPartialRub) : "",
  );
  const [excludeFromReconciliation, setExcludeFromReconciliation] = useState(
    () => initial.excludeFromReconciliation === true,
  );
  const [hasScans, setHasScans] = useState(initial.hasScans);
  const [hasCt, setHasCt] = useState(initial.hasCt);
  const [hasMri, setHasMri] = useState(initial.hasMri);
  const [hasPhoto, setHasPhoto] = useState(initial.hasPhoto);
  const [additionalSourceNotes, setAdditionalSourceNotes] = useState(
    initial.additionalSourceNotes ?? "",
  );

  const [draftLines, setDraftLines] = useState<DraftConstructionLine[]>(() =>
    constructionsToDraft(initial.constructions),
  );
  const [labDueAutoByPrice, setLabDueAutoByPrice] = useState(
    () => !Boolean(initial.dueDate),
  );
  const productionCalendarCountry = normalizeProductionCalendarCountry(
    initial.productionCalendarCountry,
  );
  const maxLeadWorkingDaysFromPriceLines = useMemo(() => {
    let maxLead: number | null = null;
    for (const row of draftLines) {
      if (row.kind !== "priceList") continue;
      const lead = row.leadWorkingDays;
      if (typeof lead !== "number" || !Number.isFinite(lead)) continue;
      const norm = Math.max(0, Math.trunc(lead));
      maxLead = maxLead == null ? norm : Math.max(maxLead, norm);
    }
    return maxLead;
  }, [draftLines]);
  /** Платная коррекция: строка прайса «КП» в составе появляется/убирается с выбором «Платно». */
  useEffect(() => {
    if (correctionTrack == null || !correctionPaid) {
      setDraftLines((prev) =>
        prev.filter(
          (row) =>
            !(
              row.kind === "priceList" &&
              row.priceListCode.trim() === CORRECTION_PRICE_ITEM_CODE
            ),
        ),
      );
      return;
    }
    let cancelled = false;
    void (async () => {
      const meta = await fetchCorrectionPriceListMeta({
        clinicId,
        doctorId,
      });
      if (cancelled || !meta) return;
      setDraftLines((prev) => {
        if (
          prev.some(
            (row) =>
              row.kind === "priceList" &&
              row.priceListCode.trim() === CORRECTION_PRICE_ITEM_CODE,
          )
        ) {
          return prev;
        }
        const line: DraftConstructionLine = {
          kind: "priceList",
          constructionTypeId: "",
          priceListItemId: meta.id,
          priceListCode: meta.code,
          priceListName: meta.name,
          priceListVariablePrice: false,
          materialId: "",
          shade: "",
          quantity: 1,
          unitPrice: String(meta.priceRub),
          lineDiscountPercent: "0",
          teethCsv: "",
          arch: null,
          bridgeFrom: "",
          bridgeTo: "",
        };
        return [...prev, line];
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [correctionTrack, correctionPaid, clinicId, doctorId]);

  useEffect(() => {
    if (!labDueAutoByPrice) return;
    if (dueLocal.trim()) return;
    if (maxLeadWorkingDaysFromPriceLines == null) return;
    const baseLocal = dueLabMinLocal;
    const autoLocal = autoLabDueLocalFromLeadWorkingDays({
      baseLocal,
      leadWorkingDays: maxLeadWorkingDaysFromPriceLines,
      slotsHm: initial.labDueHmSlots,
      country: productionCalendarCountry,
    });
    if (!autoLocal.trim()) return;
    const next = clampLabDueLocalToMin(
      autoLocal,
      dueLabMinLocal,
      initial.labDueHmSlots,
    );
    setDueLocal(next);
    if (next.trim()) {
      const hm = parseHmFromDueGridLocal(next);
      setLabWholeDay(!(hm != null && hm !== DUE_DAY_DEFAULT_HM));
    }
  }, [
    dueLabMinLocal,
    dueLocal,
    initial.labDueHmSlots,
    labDueAutoByPrice,
    maxLeadWorkingDaysFromPriceLines,
    productionCalendarCountry,
  ]);

  const [compositionDiscountPercent, setCompositionDiscountPercent] = useState(
    () => initial.compositionDiscountPercent ?? 0,
  );
  const [prosthetics, setProsthetics] = useState<OrderProstheticsV1>(
    () => initial.prosthetics,
  );
  const [prostheticsOurSaleRub, setProstheticsOurSaleRub] = useState(0);
  const [orderNumberDraft, setOrderNumberDraft] = useState(
    () => initial.orderNumber,
  );
  const [orderNumberModalOpen, setOrderNumberModalOpen] = useState(false);
  const [orderNumberModalDraft, setOrderNumberModalDraft] = useState("");
  const [orderNumberModalError, setOrderNumberModalError] = useState<
    string | null
  >(null);
  const [savingOrderNumber, setSavingOrderNumber] = useState(false);

  const [saving, setSaving] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flushInvoiceParsedToServer = useCallback(async () => {
    if (invoiceParsedAutosaveTimerRef.current != null) {
      window.clearTimeout(invoiceParsedAutosaveTimerRef.current);
      invoiceParsedAutosaveTimerRef.current = null;
    }
    const live = invoiceParsedLiveRef.current;
    const curSummary = live.summary.trim() || null;
    const curTotal = parseInvoiceTotalRubRuInput(live.totalText);
    const p = lastPersistedInvoiceParsedRef.current;
    if (p.summaryText === curSummary && p.totalRub === curTotal) return;
    try {
      const res = await fetch(`/api/orders/${initial.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceParsedSummaryText: curSummary,
          invoiceParsedTotalRub: curTotal,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(
          data.error ?? "Не удалось сохранить блок «Выставлено по счёту»",
        );
        return;
      }
      lastPersistedInvoiceParsedRef.current = {
        summaryText: curSummary,
        totalRub: curTotal,
      };
    } catch {
      setError("Сеть или сервер недоступны");
    }
  }, [initial.id]);

  useEffect(() => {
    const summaryText = invoiceParsedSummaryText.trim() || null;
    const totalRub = invoiceParsedTotalRub;
    const prev = lastPersistedInvoiceParsedRef.current;
    if (prev.summaryText === summaryText && prev.totalRub === totalRub) {
      return;
    }
    if (invoiceParsedAutosaveTimerRef.current != null) {
      window.clearTimeout(invoiceParsedAutosaveTimerRef.current);
    }
    const delayMs = 500;
    invoiceParsedAutosaveTimerRef.current = window.setTimeout(() => {
      invoiceParsedAutosaveTimerRef.current = null;
      void flushInvoiceParsedToServer();
    }, delayMs);
    return () => {
      if (invoiceParsedAutosaveTimerRef.current != null) {
        window.clearTimeout(invoiceParsedAutosaveTimerRef.current);
        invoiceParsedAutosaveTimerRef.current = null;
      }
    };
  }, [
    flushInvoiceParsedToServer,
    initial.id,
    invoiceParsedSummaryText,
    invoiceParsedTotalRubText,
    invoiceParsedTotalRub,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/clinics");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as {
          clinics: ClinicRow[];
          privatePracticeDoctors?: DoctorRow[];
          allDoctors?: DoctorRow[];
        };
        if (!cancelled) {
          setClinics(data.clinics ?? []);
          setPrivatePracticeDoctors(data.privatePracticeDoctors ?? []);
          setAllDoctors(data.allDoctors ?? []);
        }
      } catch {
        if (!cancelled) {
          setLoadClinicsError("Не удалось загрузить список клиник");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/couriers");
        if (!res.ok) return;
        const data = (await res.json()) as CourierOption[];
        if (!cancelled) {
          setCouriers(Array.isArray(data) ? data : []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const doctorsForClinic = useMemo(
    () =>
      orderDoctorsForClinicCombobox(
        clinicId,
        privatePracticeDoctors,
        clinics,
        allDoctors,
      ),
    [clinics, clinicId, privatePracticeDoctors, allDoctors],
  );

  const prioritizedClinics = useMemo(() => {
    if (!doctorId) return clinics;
    return [...clinics].sort((a, b) => {
      const aHasDoctor = a.doctors.some((d) => d.id === doctorId);
      const bHasDoctor = b.doctors.some((d) => d.id === doctorId);
      if (aHasDoctor !== bHasDoctor) return aHasDoctor ? -1 : 1;
      return clinicSelectLabel(a).localeCompare(clinicSelectLabel(b), "ru");
    });
  }, [clinics, doctorId]);

  const clinicComboboxOptions = useMemo(
    () => [
      ...prioritizedClinics.map((c) => ({
        value: c.id,
        label: clinicSelectLabel(c),
        searchPrefixes: clinicComboboxSearchPrefixes(c),
      })),
      { value: ORDER_CLINIC_PRIVATE, label: "Частная практика" },
    ],
    [prioritizedClinics],
  );

  const doctorComboboxOptions = useMemo(
    () =>
      doctorsForClinic.map((d) => ({
        value: d.id,
        label: d.fullName,
        searchPrefixes: doctorComboboxSearchPrefixes(d.fullName),
      })),
    [doctorsForClinic],
  );

  const courierPickupOptions = useMemo(() => {
    const rows = [...couriers];
    const nm = initial.courierPickupName ?? initial.courierName;
    if (
      courierPickupId &&
      !rows.some((c) => c.id === courierPickupId) &&
      nm
    ) {
      rows.push({
        id: courierPickupId,
        name: `${nm} (не в списке)`,
      });
    }
    return rows;
  }, [couriers, courierPickupId, initial.courierPickupName, initial.courierName]);

  const courierDeliveryOptions = useMemo(() => {
    const rows = [...couriers];
    if (
      courierDeliveryId &&
      !rows.some((c) => c.id === courierDeliveryId) &&
      initial.courierDeliveryName
    ) {
      rows.push({
        id: courierDeliveryId,
        name: `${initial.courierDeliveryName} (не в списке)`,
      });
    }
    return rows;
  }, [couriers, courierDeliveryId, initial.courierDeliveryName]);

  const onClinicChange = useCallback(
    (cid: string) => {
      setClinicId(cid);
      const row =
        cid && cid !== ORDER_CLINIC_PRIVATE
          ? clinics.find((c) => c.id === cid)
          : undefined;
      if (row?.sourceDoctorId) {
        setDoctorId(row.sourceDoctorId);
        return;
      }
      setDoctorId((prev) => {
        if (!prev) return "";
        const allowed = orderDoctorsForClinicCombobox(
          cid,
          privatePracticeDoctors,
          clinics,
          allDoctors,
        );
        return allowed.some((d) => d.id === prev) ? prev : "";
      });
    },
    [clinics, privatePracticeDoctors, allDoctors],
  );

  const prevClinicIdForLegalRef = useRef<string | null>(null);

  const selectedClinic = useMemo(
    () =>
      clinicId && clinicId !== ORDER_CLINIC_PRIVATE
        ? clinics.find((c) => c.id === clinicId)
        : undefined,
    [clinicId, clinics],
  );

  const effectiveFinanceClinic = useMemo(() => {
    if (clinicId && clinicId !== ORDER_CLINIC_PRIVATE) {
      return selectedClinic;
    }
    const d = allDoctors.find((x) => x.id === doctorId);
    if (
      (clinicId === "" || clinicId === ORDER_CLINIC_PRIVATE) &&
      legalEntity === "ИП" &&
      d?.ipClinicId
    ) {
      return clinics.find((c) => c.id === d.ipClinicId);
    }
    return undefined;
  }, [clinicId, legalEntity, selectedClinic, doctorId, allDoctors, clinics]);

  const selectedDoctor = useMemo(() => {
    if (!doctorId) return undefined;
    const fromAll = allDoctors.find((d) => d.id === doctorId);
    if (fromAll) return fromAll;
    return doctorsForClinic.find((d) => d.id === doctorId);
  }, [doctorId, allDoctors, doctorsForClinic]);

  const invoiceCopyClipboardText = useMemo(() => {
    const num = (orderNumberDraft.trim() || initial.orderNumber).trim();
    const patRaw = patientName.trim();
    const pat =
      personNameSurnameInitials(patRaw || null) || patRaw || "—";
    const docRaw = selectedDoctor?.fullName?.trim() ?? "";
    const doc =
      personNameSurnameInitials(docRaw || null) || docRaw || "—";
    return [num, pat, doc]
      .map((s) => String(s).trim())
      .join(" ");
  }, [
    orderNumberDraft,
    initial.orderNumber,
    patientName,
    selectedDoctor,
  ]);

  const clientLegalNameForCopy = useMemo(
    () => cleanLegalFullName(effectiveFinanceClinic?.legalFullName) ?? null,
    [effectiveFinanceClinic],
  );
  const clientInnForCopy = useMemo(() => {
    const inn = (effectiveFinanceClinic?.inn ?? "").trim();
    return inn || null;
  }, [effectiveFinanceClinic]);

  const invoiceCopyAllClipboardText = useMemo(
    () =>
      [invoiceCopyClipboardText, clientLegalNameForCopy, clientInnForCopy]
        .map((s) => (s ?? "").trim())
        .filter(Boolean)
        .join(" "),
    [invoiceCopyClipboardText, clientLegalNameForCopy, clientInnForCopy],
  );

  const [invoiceCopyToast, setInvoiceCopyToast] = useState<string | null>(null);
  const copyInvoiceBlockText = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setInvoiceCopyToast("Скопировано");
      window.setTimeout(() => setInvoiceCopyToast(null), 2000);
    } catch {
      setInvoiceCopyToast("Не удалось скопировать");
      window.setTimeout(() => setInvoiceCopyToast(null), 2500);
    }
  }, []);

  const copyLockedFieldToClipboard = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      toast.success("Скопировано");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }, []);

  const clinicLockedLabel = useMemo(
    () => clinicComboboxOptions.find((o) => o.value === clinicId)?.label ?? "",
    [clinicComboboxOptions, clinicId],
  );
  const doctorLockedLabel = useMemo(
    () => doctorComboboxOptions.find((o) => o.value === doctorId)?.label ?? "",
    [doctorComboboxOptions, doctorId],
  );

  const resolvedOrderPriceListKind = useMemo(() => {
    const cid =
      clinicId && clinicId !== ORDER_CLINIC_PRIVATE
        ? clinicId
        : effectiveFinanceClinic && legalEntity === "ИП"
          ? effectiveFinanceClinic.id
          : null;
    const clinicForPrice = selectedClinic ?? effectiveFinanceClinic;
    const doctorKindFromClinic =
      doctorId && selectedClinic
        ? selectedClinic.doctors.find((d) => d.id === doctorId)
            ?.orderPriceListKind ?? null
        : null;
    const doctorKindFromAll =
      allDoctors.find((d) => d.id === doctorId)?.orderPriceListKind ?? null;
    return resolvedOrderPriceListKindFromContractors({
      clinicId: cid,
      doctorKind: doctorKindFromClinic ?? doctorKindFromAll,
      clinicKind: clinicForPrice?.orderPriceListKind ?? null,
    });
  }, [clinicId, legalEntity, selectedClinic, effectiveFinanceClinic, doctorId, allDoctors]);

  const orderPriceListUiLabel = useMemo(
    () =>
      orderPriceListFieldDisplayLabel(
        resolvedOrderPriceListKind,
        initial.workspaceActivePriceListName,
      ),
    [
      resolvedOrderPriceListKind,
      initial.workspaceActivePriceListName,
    ],
  );

  const paymentSelectOptions = useMemo(() => {
    const fin = effectiveFinanceClinic ?? selectedClinic;
    const includeSverka = fin?.worksWithReconciliation === true;
    const base = includeSverka
      ? [ORDER_PAYMENT_RECON_UNPAID, ORDER_PAYMENT_RECON_PAID]
      : PAYMENT_OPTIONS.filter(
          (p) =>
            p !== ORDER_PAYMENT_RECON_UNPAID &&
            p !== ORDER_PAYMENT_RECON_PAID,
        );
    return withExtraSelectOption(base, payment);
  }, [effectiveFinanceClinic, selectedClinic, payment]);

  const isReconciliationClinic =
    (effectiveFinanceClinic ?? selectedClinic)?.worksWithReconciliation === true;

  const legalOptions = useMemo(
    () => withExtraSelectOption(LEGAL_ENTITIES, legalEntity),
    [legalEntity],
  );

  /** Юр. лицо из карточки клиники; для частной практики — вручную. */
  useEffect(() => {
    const prev = prevClinicIdForLegalRef.current;
    prevClinicIdForLegalRef.current = clinicId;

    if (clinicId === "" || clinicId === ORDER_CLINIC_PRIVATE) {
      if (prev != null && prev !== "" && prev !== ORDER_CLINIC_PRIVATE) {
        setLegalEntity(LEGAL_ENTITIES[0]);
      }
      return;
    }
    const row = clinics.find((x) => x.id === clinicId);
    if (!row) return;
    setLegalEntity(legalEntitySelectFromClinicBilling(row.billingLegalForm));
    if (prev !== null && prev !== clinicId) {
      if (row.worksWithReconciliation === true) {
        setPayment((current) =>
          current === ORDER_PAYMENT_RECON_PAID
            ? ORDER_PAYMENT_RECON_PAID
            : ORDER_PAYMENT_RECON_UNPAID,
        );
      } else {
        setPayment(ORDER_PAYMENT_NOT_PAID);
      }
    }
  }, [clinicId, clinics]);

  useEffect(() => {
    if (isReconciliationClinic) {
      if (
        payment !== ORDER_PAYMENT_RECON_UNPAID &&
        payment !== ORDER_PAYMENT_RECON_PAID
      ) {
        setPayment(ORDER_PAYMENT_RECON_UNPAID);
      }
      return;
    }
    if (isReconciliationPaymentStatus(payment)) {
      setPayment(ORDER_PAYMENT_NOT_PAID);
    }
  }, [isReconciliationClinic, payment]);

  useEffect(() => {
    if (clinicId !== "" && clinicId !== ORDER_CLINIC_PRIVATE) return;
    if (legalEntity !== "ИП") return;
    const c = effectiveFinanceClinic;
    if (c?.worksWithReconciliation === true) {
      setPayment((current) =>
        current === ORDER_PAYMENT_RECON_PAID
          ? ORDER_PAYMENT_RECON_PAID
          : ORDER_PAYMENT_RECON_UNPAID,
      );
    }
  }, [clinicId, legalEntity, effectiveFinanceClinic]);

  useEffect(() => {
    if (payment === ORDER_PAYMENT_PARTIAL) return;
    if (paymentPartialRubText === "") return;
    setPaymentPartialRubText("");
  }, [payment, paymentPartialRubText]);

  const [depositAppliedRub, setDepositAppliedRub] = useState(
    () => initial.depositAppliedRub ?? null,
  );
  const [depositClinicBalanceRub, setDepositClinicBalanceRub] = useState(
    () => initial.depositClinicBalanceRub ?? 0,
  );
  const [depositDoctorBalanceRub, setDepositDoctorBalanceRub] = useState(
    () => initial.depositDoctorBalanceRub ?? initial.depositBalanceRub ?? 0,
  );
  const [depositBusy, setDepositBusy] = useState(false);

  useEffect(() => {
    setDepositAppliedRub(initial.depositAppliedRub ?? null);
    setDepositClinicBalanceRub(initial.depositClinicBalanceRub ?? 0);
    setDepositDoctorBalanceRub(
      initial.depositDoctorBalanceRub ?? initial.depositBalanceRub ?? 0,
    );
  }, [
    initial.id,
    initial.depositAppliedRub,
    initial.depositClinicBalanceRub,
    initial.depositDoctorBalanceRub,
    initial.depositBalanceRub,
  ]);

  const financePreviewTotal = useMemo(() => {
    const payload = draftToConstructionPayload(draftLines) as Array<{
      quantity?: number;
      unitPrice?: number | null;
      lineDiscountPercent?: number;
    }>;
    const lines = payload.map((row) => ({
      quantity: typeof row.quantity === "number" ? row.quantity : 1,
      unitPrice:
        row.unitPrice != null &&
        typeof row.unitPrice === "number" &&
        !Number.isNaN(row.unitPrice)
          ? row.unitPrice
          : null,
      lineDiscountPercent:
        typeof row.lineDiscountPercent === "number" &&
        !Number.isNaN(row.lineDiscountPercent)
          ? row.lineDiscountPercent
          : 0,
    }));
    const sub = orderCompositionSubtotalAfterDiscountsRub(
      lines,
      compositionDiscountPercent,
    );
    return orderPayableAfterDepositRub(
      sub,
      urgentPriceMult,
      depositAppliedRub,
      prostheticsOurSaleRub,
    );
  }, [
    draftLines,
    compositionDiscountPercent,
    urgentPriceMult,
    depositAppliedRub,
    prostheticsOurSaleRub,
  ]);

  const documentFlowCompositionRows = useMemo(() => {
    return draftLines
      .filter((row) =>
        row.kind === "priceList" ? Boolean(row.priceListItemId.trim()) : true,
      )
      .map((row) => {
        const priceRaw = row.unitPrice.trim();
        const unitPrice =
          priceRaw === "" ? null : Number(priceRaw.replace(",", "."));
        const amountRub = lineNetAfterLineDiscountRub(
          row.quantity,
          unitPrice != null && !Number.isNaN(unitPrice) ? unitPrice : null,
          parseDraftDiscountPercentString(row.lineDiscountPercent ?? "0"),
        );
        const code = row.priceListCode.trim();
        const name = row.priceListName.trim();
        const title =
          code && name ? `${code} · ${name}` : name || code || "Позиция";
        const quantity =
          Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1;
        return { title, quantity, amountRub };
      });
  }, [draftLines]);

  /** Сумма по счёту заполнена и расходится с составом; подтверждённая пара не светится. */
  const invoiceCompositionMismatch = useMemo(() => {
    const u = parseUrgentSelection(urgentSelection);
    const payload = draftToConstructionPayload(draftLines) as Array<{
      quantity?: number;
      unitPrice?: number | null;
      lineDiscountPercent?: number;
    }>;
    return orderInvoiceCompositionMismatch({
      invoiceParsedTotalRub,
      isUrgent: u.isUrgent,
      urgentCoefficient: u.urgentCoefficient,
      compositionDiscountPercent,
      invoiceMismatchAckFingerprint: mismatchAckFingerprint,
      prostheticsOurRub: prostheticsOurSaleRub,
      constructions: payload.map((row) => ({
        quantity: typeof row.quantity === "number" ? row.quantity : 1,
        unitPrice:
          row.unitPrice != null &&
          typeof row.unitPrice === "number" &&
          !Number.isNaN(row.unitPrice)
            ? row.unitPrice
            : null,
        lineDiscountPercent:
          typeof row.lineDiscountPercent === "number" &&
          !Number.isNaN(row.lineDiscountPercent)
            ? row.lineDiscountPercent
            : 0,
      })),
    });
  }, [
    draftLines,
    compositionDiscountPercent,
    urgentSelection,
    invoiceParsedTotalRub,
    mismatchAckFingerprint,
    prostheticsOurSaleRub,
  ]);

  const ackInvoiceMismatch = useCallback(async () => {
    const u = parseUrgentSelection(urgentSelection);
    const payload = draftToConstructionPayload(draftLines) as Array<{
      quantity?: number;
      unitPrice?: number | null;
      lineDiscountPercent?: number;
    }>;
    const fp = invoiceMismatchFingerprintFor({
      invoiceParsedTotalRub,
      isUrgent: u.isUrgent,
      urgentCoefficient: u.urgentCoefficient,
      compositionDiscountPercent,
      prostheticsOurRub: prostheticsOurSaleRub,
      constructions: payload.map((row) => ({
        quantity: typeof row.quantity === "number" ? row.quantity : 1,
        unitPrice:
          row.unitPrice != null &&
          typeof row.unitPrice === "number" &&
          !Number.isNaN(row.unitPrice)
            ? row.unitPrice
            : null,
        lineDiscountPercent:
          typeof row.lineDiscountPercent === "number" &&
          !Number.isNaN(row.lineDiscountPercent)
            ? row.lineDiscountPercent
            : 0,
      })),
    });
    if (!fp) return;
    setMismatchAckBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceMismatchAckFingerprint: fp }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось подтвердить расхождение");
        return;
      }
      setMismatchAckFingerprint(fp);
      setMismatchConfirmOpen(false);
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setMismatchAckBusy(false);
    }
  }, [
    draftLines,
    compositionDiscountPercent,
    urgentSelection,
    invoiceParsedTotalRub,
    prostheticsOurSaleRub,
    initial.id,
    router,
  ]);

  const toggleInvoiceIssued = useCallback(
    async (next: boolean) => {
      setInvoiceSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceIssued: next }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Не удалось сохранить признак счёта");
          return;
        }
        setInvoiceIssued(next);
        router.refresh();
      } catch {
        setError("Сеть или сервер недоступны");
      } finally {
        setInvoiceSaving(false);
      }
    },
    [initial.id, router],
  );

  const toggleInvoicePrinted = useCallback(
    async (next: boolean) => {
      setInvoiceSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoicePrinted: next }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Не удалось сохранить отметку");
          return;
        }
        setInvoicePrinted(next);
        router.refresh();
      } catch {
        setError("Сеть или сервер недоступны");
      } finally {
        setInvoiceSaving(false);
      }
    },
    [initial.id, router],
  );

  const toggleUpdPrinted = useCallback(
    async (next: boolean) => {
      setInvoiceSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updPrinted: next }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Не удалось сохранить отметку");
          return;
        }
        setUpdPrinted(next);
        router.refresh();
      } catch {
        setError("Сеть или сервер недоступны");
      } finally {
        setInvoiceSaving(false);
      }
    },
    [initial.id, router],
  );

  const removeUpdAttachment = useCallback(async () => {
    const attId = updAttachmentId;
    if (!attId) return;
    const okConfirm = window.confirm("Удалить файл УПД из наряда?");
    if (!okConfirm) return;
    setInvoiceDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/orders/${initial.id}/attachments/${attId}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось удалить файл УПД");
        return;
      }
      setUpdAttachmentId(null);
      toast.success("Файл УПД удалён");
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setInvoiceDeleting(false);
    }
  }, [initial.id, updAttachmentId, router]);

  const toggleInvoiceDocFlag = useCallback(
    async (
      field: "invoicePaperDocs" | "invoiceSentToEdo" | "invoiceEdoSigned",
      next: boolean,
    ) => {
      setInvoiceSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: next }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Не удалось сохранить отметку");
          return;
        }
        if (field === "invoicePaperDocs") setInvoicePaperDocs(next);
        else if (field === "invoiceSentToEdo") setInvoiceSentToEdo(next);
        else setInvoiceEdoSigned(next);
        router.refresh();
      } catch {
        setError("Сеть или сервер недоступны");
      } finally {
        setInvoiceSaving(false);
      }
    },
    [initial.id, router],
  );

  const persistProstheticsOrdered = useCallback(
    async (next: boolean, revertTo: boolean) => {
      setProstheticsOrderedPersisting(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${initial.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prostheticsOrdered: next }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setProstheticsOrdered(revertTo);
          setError(
            data.error ?? "Не удалось сохранить «Протетика заказана»",
          );
          return;
        }
        router.refresh();
      } catch {
        setProstheticsOrdered(revertTo);
        setError("Сеть или сервер недоступны");
      } finally {
        setProstheticsOrderedPersisting(false);
      }
    },
    [initial.id, router],
  );

  const removeInvoiceAttachment = useCallback(async () => {
    const attId = invoiceAttachmentId;
    if (!attId) return;
    const okConfirm = window.confirm(
      "Удалить файл счёта из наряда?\n\nБудут сброшены: текст «Выставлено», сумма по счёту, строки разбора PDF и снимется галочка «Счёт выставлен».",
    );
    if (!okConfirm) return;
    setInvoiceDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/orders/${initial.id}/attachments/${attId}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось удалить файл счёта");
        return;
      }
      setInvoiceAttachmentId(null);
      setInvoiceIssued(false);
      setInvoiceParsedSummaryText("");
      setInvoiceParsedTotalRubText("");
      lastPersistedInvoiceParsedRef.current = {
        summaryText: null,
        totalRub: null,
      };
      setInvoiceParseHint(null);
      toast.success("Файл счёта удалён");
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setInvoiceDeleting(false);
    }
  }, [initial.id, invoiceAttachmentId, router]);

  const closeOrderNumberModal = useCallback(() => {
    setOrderNumberModalOpen(false);
    setOrderNumberModalDraft("");
    setOrderNumberModalError(null);
  }, []);

  const saveOrderNumberFromModal = useCallback(async () => {
    setOrderNumberModalError(null);
    const next = orderNumberModalDraft.trim();
    if (!next) {
      setOrderNumberModalError("Укажите номер наряда");
      return;
    }
    if (next === initial.orderNumber) {
      closeOrderNumberModal();
      return;
    }
    const okConfirm = window.confirm(
      `Сменить номер наряда?\n\nСейчас: ${initial.orderNumber}\nБудет: ${next}\n\nНомер обновится в списках, печати PDF и в заголовке карточки Kaiten (если к наряду привязана карточка).`,
    );
    if (!okConfirm) return;
    setSavingOrderNumber(true);
    try {
      const res = await fetch(`/api/orders/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: next }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        kaitenTitleSyncError?: string | null;
      };
      if (!res.ok) {
        setOrderNumberModalError(data.error ?? "Не удалось сохранить номер");
        return;
      }
      if (data.kaitenTitleSyncError) {
        toast.warning("Номер обновлён", {
          description: `Заголовок в Kaiten не обновился: ${data.kaitenTitleSyncError}`,
        });
      } else {
        toast.success("Номер наряда обновлён");
      }
      setOrderNumberDraft(next);
      closeOrderNumberModal();
      router.refresh();
    } catch {
      setOrderNumberModalError("Сеть или сервер недоступны");
    } finally {
      setSavingOrderNumber(false);
    }
  }, [
    orderNumberModalDraft,
    initial.id,
    initial.orderNumber,
    router,
    closeOrderNumberModal,
  ]);

  useEffect(() => {
    if (!orderNumberModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !savingOrderNumber) closeOrderNumberModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orderNumberModalOpen, savingOrderNumber, closeOrderNumberModal]);

  const save = useCallback(async () => {
    setError(null);
    if (!canEditOrder) {
      setError("Нет прав на редактирование наряда");
      return;
    }
    if (!isOrderPageFramed) {
      const nextOrderNumber = orderNumberDraft.trim();
      if (!nextOrderNumber) {
        setError("Укажите номер наряда");
        return;
      }
      if (nextOrderNumber !== initial.orderNumber) {
        const okConfirm = window.confirm(
          `Сменить номер наряда?\n\nСейчас: ${initial.orderNumber}\nБудет: ${nextOrderNumber}\n\nНомер обновится в списках, печати PDF и в заголовке карточки Kaiten (если к наряду привязана карточка).`,
        );
        if (!okConfirm) return;
      }
    }
    setSaving(true);
  let parsedPaymentPartialRub: number | null = null;
  if (payment === ORDER_PAYMENT_PARTIAL) {
    const n = Number(paymentPartialRubText.trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      setSaving(false);
      setError("Для частичной оплаты укажите сумму (целые рубли)");
      return;
    }
    parsedPaymentPartialRub = n;
  }
    try {
      const resolvedClinicId =
        clinicId === ORDER_CLINIC_PRIVATE ? null : clinicId.trim() || null;
      const constructions = draftToConstructionPayload(draftLines);

      const res = await fetch(`/api/orders/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!isOrderPageFramed &&
          orderNumberDraft.trim() !== initial.orderNumber
            ? { orderNumber: orderNumberDraft.trim() }
            : {}),
          clinicId: resolvedClinicId,
          doctorId: doctorId.trim(),
          patientName: patientName.trim() || null,
          notes: notes.trim() || null,
          clientOrderText: clientOrderText.trim() || null,
          labWorkStatus,
          urgentSelection,
          dueDate: dueLocal.trim()
            ? localDateTimeToIso(
                clampLabDueLocalToMin(
                  snapDatetimeLocalToLabDueGrid(
                    dueLocal,
                    initial.labDueHmSlots,
                  ),
                  dueLabMinLocal,
                  initial.labDueHmSlots,
                ),
              )
            : null,
          dueToAdminsAt: dueAdminsLocal.trim()
            ? localDateTimeToIso(
                clampDueLocalToMin(
                  (() => {
                    let s = snapDatetimeLocalToDueGrid(dueAdminsLocal);
                    const hm = appointmentHmForMode(appointmentMode);
                    if (s && hm) s = replaceAppointmentLocalHm(s, hm);
                    return s;
                  })(),
                  dueDateMinLocal,
                ),
              )
            : null,
          kaitenAdminDueHasTime: !labWholeDay,
          dueToAdminsHasTime: appointmentHasTimeFlag(appointmentMode),
          invoiceIssued,
          invoiceNumber: invoiceNumber.trim() || null,
          invoicePaperDocs,
          invoiceSentToEdo,
          invoiceEdoSigned,
          invoicePrinted,
          updNumber: updNumber.trim() || null,
          updPrinted,
          narjadPrinted,
          adminShippedOtpr,
          shippedDescription: shippedDescription.trim() || null,
          invoicePaymentNotes: invoicePaymentNotes.trim() || null,
          invoiceParsedSummaryText: invoiceParsedSummaryText.trim() || null,
          invoiceParsedTotalRub: invoiceParsedTotalRub,
          orderPriceListNote: initial.orderPriceListNote,
          prostheticsOrdered,
          correctionTrack,
          correctionReason:
            correctionTrack != null
              ? correctionReason.trim() || null
              : null,
          correctionPaid:
            correctionTrack != null ? correctionPaid : false,
          courierPickupId: courierPickupId.trim() || null,
          courierDeliveryId: courierDeliveryId.trim() || null,
          courierId: courierPickupId.trim() || null,
          legalEntity:
            legalEntity === LEGAL_ENTITIES[0] ? null : legalEntity.trim(),
          payment: payment.trim() || null,
          paymentPartialRub: parsedPaymentPartialRub,
          ...(isReconciliationPaymentStatus(payment)
            ? { excludeFromReconciliation }
            : { excludeFromReconciliation: false }),
          hasScans,
          hasCt,
          hasMri,
          hasPhoto,
          additionalSourceNotes: additionalSourceNotes.trim() || null,
          constructions,
          compositionDiscountPercent,
          financeCalculated,
          prosthetics,
          ...(continuesFromOrderId !== (initial.continuesFromOrder?.id ?? null)
            ? { continuesFromOrderId }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        kaitenTitleSyncError?: string | null;
      };
      if (!res.ok) {
        const msg = data.error ?? "Не удалось сохранить";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (data.kaitenTitleSyncError) {
        toast.warning("Наряд сохранён", {
          description: `Заголовок в Kaiten не обновился: ${data.kaitenTitleSyncError}`,
        });
      } else {
        toast.success("Наряд сохранён");
      }
      router.refresh();
    } catch {
      const msg = "Сеть или сервер недоступны";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [
    initial.id,
    initial.orderNumber,
    isOrderPageFramed,
    orderNumberDraft,
    clinicId,
    doctorId,
    patientName,
    notes,
    clientOrderText,
    labWorkStatus,
    urgentSelection,
    dueLocal,
    dueAdminsLocal,
    dueDateMinLocal,
    dueLabMinLocal,
    initial.labDueHmSlots,
    labWholeDay,
    appointmentMode,
    invoiceIssued,
    invoiceNumber,
    invoicePaperDocs,
    invoiceSentToEdo,
    invoiceEdoSigned,
    invoicePrinted,
    updNumber,
    updPrinted,
    narjadPrinted,
    adminShippedOtpr,
    shippedDescription,
    invoicePaymentNotes,
    invoiceParsedSummaryText,
    invoiceParsedTotalRub,
    initial.orderPriceListNote,
    prostheticsOrdered,
    correctionTrack,
    correctionReason,
    correctionPaid,
    courierPickupId,
    courierDeliveryId,
    legalEntity,
    payment,
    paymentPartialRubText,
    excludeFromReconciliation,
    hasScans,
    hasCt,
    hasMri,
    hasPhoto,
    additionalSourceNotes,
    draftLines,
    compositionDiscountPercent,
    financeCalculated,
    prosthetics,
    continuesFromOrderId,
    initial.continuesFromOrder?.id,
    router,
    canEditOrder,
  ]);

  const confirmArchiveOrder = useCallback(async () => {
    setArchiveErr(null);
    setArchiveBusy(true);
    try {
      const res = await fetch(`/api/orders/${initial.id}/archive`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setArchiveErr(j.error ?? "Не удалось выполнить");
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(CRM_ORDER_ARCHIVED_EVENT));
      }
      setArchiveConfirmOpen(false);
      router.push("/orders/archived");
      router.refresh();
    } catch {
      setArchiveErr("Сеть или сервер недоступны");
    } finally {
      setArchiveBusy(false);
    }
  }, [initial.id, router]);

  /** В блоке «Наряд» справа от печати: отметка отправки (цвет не как у «Сохранить наряд»). */
  const [orderLayoutPrefs, setOrderLayoutPrefs] = useState<OrderEditLayoutV1>(
    () => defaultOrderEditLayout(),
  );
  const [orderLayoutCustomize, setOrderLayoutCustomize] = useState(false);

  useEffect(() => {
    if (!orderPageFrame) return;
    let cancelled = false;
    void (async () => {
      const local = loadOrderEditLayout(sessionUserId);
      const key = sessionUserId ? `orderEditLayout:${sessionUserId}` : null;
      if (!key) {
        if (!cancelled) setOrderLayoutPrefs(local);
        return;
      }
      const remote = await readClientState<unknown>("user", key);
      if (cancelled) return;
      if (remote && typeof remote === "object") {
        setOrderLayoutPrefs(remote as OrderEditLayoutV1);
        return;
      }
      setOrderLayoutPrefs(local);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderPageFrame, sessionUserId]);

  const persistOrderLayout = useCallback(
    (next: OrderEditLayoutV1) => {
      setOrderLayoutPrefs(next);
      saveOrderEditLayout(sessionUserId, next);
      if (sessionUserId) {
        void writeClientState("user", `orderEditLayout:${sessionUserId}`, next);
      }
    },
    [sessionUserId],
  );

  const orderLayoutForPageGrid = orderLayoutPrefs;

  useEffect(() => {
    if (isAccountant && orderLayoutCustomize) {
      setOrderLayoutCustomize(false);
    }
  }, [isAccountant, orderLayoutCustomize]);

  const resetOrderLayoutToDefault = useCallback(() => {
    clearOrderEditLayout(sessionUserId);
    const d = defaultOrderEditLayout();
    setOrderLayoutPrefs(d);
    saveOrderEditLayout(sessionUserId, d);
    if (sessionUserId) {
      void writeClientState("user", `orderEditLayout:${sessionUserId}`, d);
    }
  }, [sessionUserId]);

  const correctionPillStrip = (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-1.5 py-1">
      <span className="px-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Корр.
      </span>
      <button
        type="button"
        className={
          correctionTrack == null
            ? "rounded-full bg-[var(--sidebar-blue)] px-2 py-0.5 text-[11px] font-semibold text-white"
            : "rounded-full px-2 py-0.5 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)]"
        }
        onClick={() => setCorrectionTrack(null)}
      >
        Нет
      </button>
      {ORDER_CORRECTION_TRACK_VALUES.map((v) => (
        <button
          key={v}
          type="button"
          title={ORDER_CORRECTION_TRACK_LABELS[v]}
          className={
            correctionTrack === v
              ? "rounded-full bg-[var(--sidebar-blue)] px-2 py-0.5 text-[11px] font-semibold text-white"
              : "rounded-full px-2 py-0.5 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)]"
          }
          onClick={() => setCorrectionTrack(v as OrderCorrectionTrack)}
        >
          {ORDER_CORRECTION_TRACK_LABELS[v]}
        </button>
      ))}
    </div>
  );

  const oeColCustomer = (
    <div className={editMainCol}>
      {loadClinicsError ? (
        <p className="mb-2 text-sm text-amber-700">{loadClinicsError}</p>
      ) : null}
      <section className="border-b border-[var(--card-border)] pb-1.5">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Заказчик
        </h3>
        <div className="space-y-1.5">
          <div>
            <div className={labelRowClass}>
              <label className={labelInlineClass} htmlFor="oe-clinic">
                Клиника
              </label>
              {!customerEditClinic ? (
                <button
                  type="button"
                  className={editChangeBtnClass}
                  onClick={() => setCustomerEditClinic(true)}
                >
                  Изменить
                </button>
              ) : null}
            </div>
            <PrefixSearchCombobox
              id="oe-clinic"
              className={comboboxClass}
              options={clinicComboboxOptions}
              value={clinicId}
              onChange={onClinicChange}
              disabled={!customerEditClinic}
              onDisabledClick={
                customerEditClinic
                  ? undefined
                  : () => void copyLockedFieldToClipboard(clinicLockedLabel)
              }
              placeholder="Название клиники, ООО или юр. наименование…"
              emptyOptionLabel="Выбрать"
            />
          </div>
          <div>
            <div className={labelRowClass}>
              <label className={labelInlineClass} htmlFor="oe-doctor">
                Врач
              </label>
              {!customerEditDoctor ? (
                <button
                  type="button"
                  className={editChangeBtnClass}
                  onClick={() => setCustomerEditDoctor(true)}
                >
                  Изменить
                </button>
              ) : null}
            </div>
            <PrefixSearchCombobox
              id="oe-doctor"
              className={comboboxClass}
              options={doctorComboboxOptions}
              value={doctorId}
              onChange={setDoctorId}
              disabled={clinicId === "" || !customerEditDoctor}
              onDisabledClick={
                !customerEditDoctor && clinicId !== ""
                  ? () => void copyLockedFieldToClipboard(doctorLockedLabel)
                  : undefined
              }
              placeholder={
                clinicId === ""
                  ? "Сначала выберите клинику"
                  : "Начните вводить ФИО врача…"
              }
              emptyOptionLabel="Выбрать"
            />
          </div>
        </div>
      </section>
      <section className="pt-1.5">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Пациент
        </h3>
        <div className="space-y-1.5">
          <div>
            <div className={labelRowClass}>
              <label className={labelInlineClass} htmlFor="oe-patient">
                ФИО пациента
              </label>
              {!customerEditPatient ? (
                <button
                  type="button"
                  className={editChangeBtnClass}
                  onClick={() => setCustomerEditPatient(true)}
                >
                  Изменить
                </button>
              ) : null}
            </div>
            <input
              id="oe-patient"
              type="text"
              readOnly={!customerEditPatient}
              title={
                !customerEditPatient
                  ? "Нажмите — скопировать в буфер обмена"
                  : undefined
              }
              className={`${inputClass}${
                !customerEditPatient
                  ? " cursor-pointer bg-[var(--surface-muted)]"
                  : ""
              }`}
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              onClick={() => {
                if (!customerEditPatient) {
                  void copyLockedFieldToClipboard(patientName);
                }
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="oe-legal">
                Юр. лицо
              </label>
              <select
                id="oe-legal"
                className={inputClass}
                value={
                  (legalOptions as string[]).includes(legalEntity)
                    ? legalEntity
                    : legalOptions[0]
                }
                onChange={(e) => setLegalEntity(e.target.value)}
              >
                {legalOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="oe-payment">
                Оплата
              </label>
              <select
                id="oe-payment"
                className={inputClass}
                disabled={isReconciliationClinic}
                value={
                  (paymentSelectOptions as string[]).includes(payment)
                    ? payment
                    : paymentSelectOptions[0] ?? ORDER_PAYMENT_NOT_PAID
                }
                onChange={(e) => setPayment(e.target.value)}
              >
                {paymentSelectOptions.map((o) => (
                  <option key={o} value={o}>
                    {isReconciliationPaymentStatus(o)
                      ? sverkaPaymentSelectLabel(
                          (effectiveFinanceClinic ?? selectedClinic)
                            ?.reconciliationFrequency,
                        ) +
                        (o === ORDER_PAYMENT_RECON_PAID ? " · ОПЛАЧЕНО" : " · НЕ ОПЛАЧЕНО")
                      : o}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {payment === ORDER_PAYMENT_PARTIAL ? (
            <div>
              <label className={labelClass} htmlFor="oe-payment-partial-rub">
                Оплачено (руб.)
              </label>
              <input
                id="oe-payment-partial-rub"
                type="number"
                min={0}
                step={1}
                className={inputClass}
                value={paymentPartialRubText}
                onChange={(e) => setPaymentPartialRubText(e.target.value)}
                placeholder="Например, 15000"
              />
            </div>
          ) : null}
          <div className="space-y-2 border-t border-[var(--card-border)] pt-2">
            <div>
              <p className={labelClass}>Прайс</p>
              <div
                className="mt-1 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-sm text-[var(--text-strong)]"
                title="Значение подставляется из карточки врача и клиники при сохранении наряда"
              >
                {orderPriceListUiLabel}
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Настраивается в карточке клиники и врача (как юрлицо): приоритет у
                врача, иначе — у клиники.
              </p>
            </div>
            {isReconciliationPaymentStatus(payment) ? (
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-2 text-sm text-[var(--text-strong)]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[var(--input-border)]"
                  checked={excludeFromReconciliation}
                  onChange={(e) =>
                    setExcludeFromReconciliation(e.target.checked)
                  }
                />
                <span>
                  Убрать из сверки
                  <span className="mt-0.5 block text-xs font-normal text-[var(--text-muted)]">
                    Не включать наряд в выгрузку сверки
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );

  const oeColDeadlines = (
    <MobileCollapsibleSection
      title={orderPageFrame ? "Сроки, оформление и курьер" : "Сроки и оформление"}
    >
    <div className={editMainCol}>
      <section className="border-b border-[var(--card-border)] pb-2">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          {orderPageFrame ? "Сроки, оформление и курьер" : "Сроки и оформление"}
        </h3>
        <div className="flex flex-col gap-2">
          <EditFormInlineLabeledRow label="Оформил">
            <div
              id="oe-registered-by"
              className="px-2 py-1 text-sm text-[var(--app-text)]"
              title="Кто оформил наряд в CRM (задаётся при созданении)"
            >
              {initial.registeredByLabel?.trim()
                ? initial.registeredByLabel.trim()
                : "—"}
            </div>
          </EditFormInlineLabeledRow>
          <EditFormInlineLabeledRow label="Поступление">
            <div
              className="px-2 py-1 text-sm tabular-nums text-[var(--app-text)]"
              title={
                initial.workReceivedAt
                  ? "Когда зашла работа (задаётся при создании наряда)"
                  : "При создании отдельная дата не указана — показана дата занесения в CRM"
              }
            >
              {formatCreatedAtRu(
                initial.workReceivedAt ?? initial.createdAt,
              )}
            </div>
          </EditFormInlineLabeledRow>
          <EditFormInlineLabeledRow label="Занесено в CRM">
            <div
              className="px-2 text-sm tabular-nums text-[var(--app-text)]"
              title="Дата и время занесения наряда в CRM"
            >
              {formatCreatedAtRu(initial.createdAt)}
            </div>
          </EditFormInlineLabeledRow>
        </div>

        <div
          className="my-3 border-t border-[var(--card-border)]"
          role="presentation"
          aria-hidden
        />

        <div className="flex flex-col gap-2">
          <DueDatetimeComboPicker
            id="oe-due"
            label="Срок лабораторный"
            labelPlacement="inside"
            tone="lab"
            value={dueLocal}
            minLocal={dueLabMinLocal}
            timeGrid="labDue"
            labHmSlots={initial.labDueHmSlots}
            title={`Срок лабораторный: ${initial.labDueHmSlots.join(", ")} или «В теч. дня»`}
            className="w-full max-w-full"
            onChange={(raw) => {
              setLabDueAutoByPrice(false);
              const s =
                raw === ""
                  ? ""
                  : snapDatetimeLocalToLabDueGrid(
                      raw,
                      initial.labDueHmSlots,
                    );
              setDueLocal(s);
              if (!s.trim()) {
                setLabWholeDay(true);
                return;
              }
              const hm = parseHmFromDueGridLocal(s);
              if (hm && hm !== DUE_DAY_DEFAULT_HM) setLabWholeDay(false);
            }}
            calendarFooter={
              <label
                htmlFor="oe-lab-whole-day"
                className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-secondary)]"
              >
                <input
                  id="oe-lab-whole-day"
                  type="checkbox"
                  className="rounded border-[var(--card-border)]"
                  checked={labWholeDay}
                  onChange={(e) => setLabWholeDay(e.target.checked)}
                />
                В теч. дня
              </label>
            }
          />
          <DueDatetimeComboPicker
            id="oe-due-admins"
            label="Запись"
            labelPlacement="inside"
            tone="appointment"
            value={dueAdminsLocal}
            minLocal={dueDateMinLocal}
            title="Дата записи пациента (8:00–23:30); «В теч. дня» → ВТЧД; «времени приёма нет» → без времени, фильтр как 08:00"
            className="w-full max-w-full"
            compactTimeLabel={
              dueAdminsLocal.trim()
                ? appointmentCompactTimeLabel(
                    appointmentMode,
                    parseHmFromDueGridLocal(dueAdminsLocal) ?? "",
                  )
                : undefined
            }
            onChange={(raw) => {
              const s =
                raw === "" ? "" : snapDatetimeLocalToDueGrid(raw);
              if (!s.trim()) {
                setDueAdminsLocal("");
                setAppointmentMode("wholeDay");
                return;
              }
              const newHm = parseHmFromDueGridLocal(s);
              const forced = appointmentHmForMode(appointmentMode);
              if (
                appointmentMode !== "timed" &&
                forced &&
                newHm &&
                newHm !== forced
              ) {
                setAppointmentMode("timed");
                setDueAdminsLocal(s);
                return;
              }
              if (forced) {
                setDueAdminsLocal(replaceAppointmentLocalHm(s, forced));
                return;
              }
              setAppointmentMode("timed");
              setDueAdminsLocal(s);
            }}
            calendarFooter={
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="oe-appt-whole-day"
                  className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-secondary)]"
                >
                  <input
                    id="oe-appt-whole-day"
                    type="checkbox"
                    className="rounded border-[var(--card-border)]"
                    checked={appointmentMode === "wholeDay"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAppointmentMode("wholeDay");
                        if (dueAdminsLocal.trim()) {
                          setDueAdminsLocal(
                            replaceAppointmentLocalHm(
                              dueAdminsLocal,
                              appointmentHmForMode("wholeDay")!,
                            ),
                          );
                        }
                      } else {
                        setAppointmentMode("timed");
                      }
                    }}
                  />
                  В теч. дня
                </label>
                <label
                  htmlFor="oe-appt-no-reception"
                  className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-secondary)]"
                >
                  <input
                    id="oe-appt-no-reception"
                    type="checkbox"
                    className="rounded border-[var(--card-border)]"
                    checked={appointmentMode === "noReception"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAppointmentMode("noReception");
                        if (dueAdminsLocal.trim()) {
                          setDueAdminsLocal(
                            replaceAppointmentLocalHm(
                              dueAdminsLocal,
                              appointmentHmForMode("noReception")!,
                            ),
                          );
                        }
                      } else {
                        setAppointmentMode("timed");
                      }
                    }}
                  />
                  Времени приёма нет
                </label>
              </div>
            }
          />
        </div>
      </section>

      {!orderPageFrame ? (
        <section className="border-b border-[var(--card-border)] py-2">
          <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
            Срочность
          </h3>
          <div className="relative z-20 flex flex-wrap items-center gap-2">
            <UrgentPillMenu
              value={urgentSelection}
              onChange={setUrgentSelection}
            />
          </div>
        </section>
      ) : null}

      <section className="border-t border-[var(--card-border)] pt-3">
        {!orderPageFrame ? (
          <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
            Курьер
          </h3>
        ) : null}
        <div className="space-y-2">
          <div>
            <label className={labelClass} htmlFor="oe-courier-pickup">
              Привоз к лаборатории
            </label>
            <select
              id="oe-courier-pickup"
              className={inputClass}
              value={courierPickupId}
              onChange={(e) => setCourierPickupId(e.target.value)}
            >
              <option value="">Не выбран</option>
              {courierPickupOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="oe-courier-delivery">
              Отвоз от лаборатории
            </label>
            <select
              id="oe-courier-delivery"
              className={inputClass}
              value={courierDeliveryId}
              onChange={(e) => setCourierDeliveryId(e.target.value)}
            >
              <option value="">Не выбран</option>
              {courierDeliveryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            <Link
              href="/directory/couriers"
              className="text-[var(--sidebar-blue)] hover:underline"
            >
              Справочник курьеров
            </Link>
          </p>
        </div>
      </section>
    </div>
    </MobileCollapsibleSection>
  );

  const oeColFiles = (
    <MobileCollapsibleSection title="Исходные данные и файлы">
    <div className={editMainCol}>
      <section className="flex min-h-0 flex-1 flex-col">
        <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Исходные данные и файлы
        </h3>
        <div className="rounded-lg border border-[var(--card-border)]/90 bg-[var(--surface-muted)] p-2 sm:p-2.5">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Что есть
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-0.5">
            <label className={`${checkboxLabelClassEdit} shrink-0`}>
              <input
                type="checkbox"
                className={checkboxInputClassEdit}
                checked={hasScans}
                onChange={(e) => setHasScans(e.target.checked)}
              />
              Сканы
            </label>
            <label className={`${checkboxLabelClassEdit} shrink-0`}>
              <input
                type="checkbox"
                className={checkboxInputClassEdit}
                checked={hasCt}
                onChange={(e) => setHasCt(e.target.checked)}
              />
              КТ
            </label>
            <label className={`${checkboxLabelClassEdit} shrink-0`}>
              <input
                type="checkbox"
                className={checkboxInputClassEdit}
                checked={hasMri}
                onChange={(e) => setHasMri(e.target.checked)}
              />
              МРТ
            </label>
            <label className={`${checkboxLabelClassEdit} shrink-0`}>
              <input
                type="checkbox"
                className={checkboxInputClassEdit}
                checked={hasPhoto}
                onChange={(e) => setHasPhoto(e.target.checked)}
              />
              Фото
            </label>
          </div>
          <div className="mt-2 border-t border-[var(--card-border)]/80 pt-2">
            <label
              className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
              htmlFor="oe-additional-source"
            >
              Ещё к работе
            </label>
            <textarea
              id="oe-additional-source"
              className={`${inputClass} min-h-[3.25rem] resize-y`}
              rows={2}
              maxLength={4000}
              value={additionalSourceNotes}
              onChange={(e) => setAdditionalSourceNotes(e.target.value)}
              placeholder="Модели, слепки, направления…"
            />
          </div>
          <div className="relative z-20 mt-2 border-t border-[var(--card-border)]/80 pt-2">
            {correctionPillStrip}
            <OrderCorrectionDetails
              track={correctionTrack}
              reason={correctionReason}
              paid={correctionPaid}
              reasonId="oe-correction-reason"
              onReasonChange={setCorrectionReason}
              onPaidChange={setCorrectionPaid}
            />
          </div>
        </div>
        <div className="mt-2 border-t border-[var(--card-border)] pt-2">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Файлы
          </h4>
          {previewMode && virtualSuggestedAttachments.length > 0 ? (
            <div className="mb-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
              <div className="font-medium text-emerald-700 dark:text-emerald-300">
                ИИ бы добавил:
              </div>
              <ul className="mt-1 list-disc pl-4 text-[var(--app-text)]">
                {virtualSuggestedAttachments.map((f) => (
                  <li key={f.fileName}>
                    {f.fileName}
                    {f.mimeType ? (
                      <span className="text-[var(--text-muted)]"> ({f.mimeType})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <OrderFilesPanel
            key={`${initial.id}-${invoiceAttachmentId ?? "no-inv"}`}
            orderId={previewMode ? null : initial.id}
            orderNumber={initial.orderNumber}
            listenPaste={!previewMode}
            onServerListChange={previewMode ? undefined : () => router.refresh()}
          />
        </div>
      </section>
    </div>
    </MobileCollapsibleSection>
  );

  const oeColClientNotes = (
    <div className={editNotesCol}>
      <div className="flex shrink-0 flex-col">
        <h3 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Заказ от клиента
        </h3>
        <textarea
          ref={clientOrderTextareaRef}
          id="oe-client-order"
          className={`${inputClass} mt-2 min-h-[4.5rem] resize-none overflow-hidden`}
          rows={3}
          value={clientOrderText}
          onChange={(e) => setClientOrderText(e.target.value)}
          placeholder="Вставьте формулировку клиента…"
        />
      </div>
      <div className="mt-3 flex shrink-0 flex-col border-t border-[var(--card-border)] pt-3">
        <h3 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Комментарий от админов
        </h3>
        <textarea
          ref={notesTextareaRef}
          id="oe-notes"
          className={`${inputClass} mt-2 min-h-[4.5rem] resize-none overflow-hidden`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Текст комментария от админов…"
        />
      </div>
      <div className="mt-3 flex shrink-0 flex-col border-t border-[var(--card-border)] pt-3">
        <h3 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Продолжение работы
        </h3>
        {continuesFromOrderId && continuesFromOrderNumber ? (
          <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
            <span className="font-medium">Продолжение работы </span>
            <Link
              href={orderPathById(continuesFromOrderId)}
              className="font-semibold text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
            >
              {continuesFromOrderNumber}
            </Link>
            <button
              type="button"
              className="ml-3 text-xs font-medium text-sky-900 underline decoration-sky-600/50 underline-offset-2 hover:decoration-sky-900"
              onClick={() => {
                setContinuesFromOrderId(null);
                setContinuesFromOrderNumber(null);
              }}
            >
              Снять связь
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Укажите предыдущий наряд того же врача и пациента (по фамилии).
          </p>
        )}
        {initial.continuationFollowups.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {initial.continuationFollowups.map((child) => (
              <p
                key={child.id}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
              >
                <span className="font-medium">
                  У этой работы есть продолжение{" "}
                </span>
                <Link
                  href={orderPathById(child.id)}
                  className="font-semibold text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
                >
                  {child.orderNumber}
                </Link>
              </p>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="mt-2 self-start rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--app-text)] hover:bg-[var(--surface-hover)]"
          onClick={() => setContinuationSearchOpen(true)}
        >
          Найти наряд…
        </button>
      </div>
    </div>
  );

  const oeMidCorrections = (
    <div
      className={`${editColWrap} flex min-h-0 flex-col xl:h-full`}
    >
      <div className="scrollbar-none -mx-3 overflow-x-auto px-3 shell-desktop:mx-0 shell-desktop:overflow-visible shell-desktop:px-0">
        <OrderChatCorrectionsPanel
          orderId={initial.id}
          corrections={initial.chatCorrections}
          canAccept={canAcceptChatCorrections}
        />
      </div>
    </div>
  );

  const depositClinicMeta = useMemo(() => {
    if (!clinicId || clinicId === ORDER_CLINIC_PRIVATE) return null;
    const row = clinics.find((c) => c.id === clinicId);
    if (row) {
      return {
        name: row.name,
        sourceDoctorId: row.sourceDoctorId ?? null,
      };
    }
    if (clinicId === initial.clinicId) {
      return {
        name: initial.depositClinicName ?? null,
        sourceDoctorId: initial.depositClinicSourceDoctorId ?? null,
      };
    }
    return null;
  }, [
    clinicId,
    clinics,
    initial.clinicId,
    initial.depositClinicName,
    initial.depositClinicSourceDoctorId,
  ]);

  const depositPartyLive = depositPartyForOrder(
    clinicId === ORDER_CLINIC_PRIVATE ? null : clinicId,
    legalEntity === LEGAL_ENTITIES[0] ? null : legalEntity,
    depositClinicMeta,
  );
  const depositBalanceRub =
    depositPartyLive === "DOCTOR"
      ? depositDoctorBalanceRub
      : depositClinicBalanceRub;

  const applyDepositOnOrder = useCallback(async () => {
    if (!canEditOrder || previewMode) return;
    setDepositBusy(true);
    try {
      const res = await fetch(`/api/orders/${initial.id}/deposit/apply`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        depositAppliedRub?: number;
        balanceRub?: number;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Не удалось учесть депозит");
        return;
      }
      setDepositAppliedRub(j.depositAppliedRub ?? 0);
      if (typeof j.balanceRub === "number") {
        if (depositPartyLive === "DOCTOR") {
          setDepositDoctorBalanceRub(j.balanceRub);
        } else {
          setDepositClinicBalanceRub(j.balanceRub);
        }
      }
      toast.success("Депозит учтён в наряде");
      router.refresh();
    } catch {
      toast.error("Сеть недоступна");
    } finally {
      setDepositBusy(false);
    }
  }, [canEditOrder, depositPartyLive, initial.id, previewMode, router]);

  const unapplyDepositOnOrder = useCallback(async () => {
    if (!canEditOrder || previewMode) return;
    setDepositBusy(true);
    try {
      const res = await fetch(`/api/orders/${initial.id}/deposit/unapply`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        balanceRub?: number;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Не удалось отменить учёт");
        return;
      }
      setDepositAppliedRub(null);
      if (typeof j.balanceRub === "number") {
        if (depositPartyLive === "DOCTOR") {
          setDepositDoctorBalanceRub(j.balanceRub);
        } else {
          setDepositClinicBalanceRub(j.balanceRub);
        }
      }
      toast.success("Учёт депозита снят");
      router.refresh();
    } catch {
      toast.error("Сеть недоступна");
    } finally {
      setDepositBusy(false);
    }
  }, [canEditOrder, depositPartyLive, initial.id, previewMode, router]);

  const depositApplied = depositAppliedRub != null && depositAppliedRub > 0;
  const depositRowVisible = depositBalanceRub > 0 || depositApplied;
  const depositRowAmountRub = depositApplied
    ? depositAppliedRub
    : depositBalanceRub;

  const oeMidConstructions = (
    <div
      className={`${editColWrap} flex min-h-0 flex-col xl:h-full ${
        invoiceCompositionMismatch
          ? "rounded-lg ring-2 ring-inset ring-amber-400/90 dark:ring-amber-400/70"
          : ""
      }`}
      title={
        invoiceCompositionMismatch
          ? "Сумма по счёту (выставлено) не совпадает с итого по составу заказа"
          : undefined
      }
    >
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Состав заказа
        </h2>
        <div className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-3 gap-y-1">
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] sm:text-xs">
            <span className="whitespace-nowrap">Просчитано</span>
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-[var(--card-border)] bg-[var(--card-bg)]"
              checked={financeCalculated}
              onChange={(e) => setFinanceCalculated(e.target.checked)}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] sm:text-xs">
            <span className="whitespace-nowrap">Скидка %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className="w-14 rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-0.5 text-base tabular-nums text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] shell-desktop:text-xs"
              value={compositionDiscountPercent}
              onChange={(e) => {
                const v = Number(e.target.value.replace(",", "."));
                if (!Number.isFinite(v)) {
                  setCompositionDiscountPercent(0);
                  return;
                }
                setCompositionDiscountPercent(Math.min(100, Math.max(0, v)));
              }}
            />
          </label>
          <p className="text-right text-xs text-[var(--text-secondary)] sm:text-sm">
            <span className="block sm:inline">
              Итого{" "}
              <strong className="tabular-nums text-[var(--text-strong)]">
                {moneyRu(financePreviewTotal)}
              </strong>
            </span>
            <span className="mt-0.5 block text-[10px] font-normal leading-tight text-[var(--text-muted)] sm:mt-0 sm:ml-2 sm:inline">
              с учётом срочности
              {depositApplied ? " и депозита" : ""}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto shell-desktop:overflow-y-auto">
        <div className="scrollbar-none -mx-3 overflow-x-auto px-3 shell-desktop:mx-0 shell-desktop:overflow-visible shell-desktop:px-0">
          {depositRowVisible ? (
            <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-violet-400/45 bg-violet-500/10 px-3 py-2">
              <div className="min-w-0 text-sm">
                <span className="font-semibold text-violet-900 dark:text-violet-200">
                  Депозит
                </span>
                <span className="ml-2 tabular-nums text-[var(--text-strong)]">
                  {moneyRu(depositRowAmountRub)}
                </span>
                <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">
                  {depositApplied
                    ? "учтено в работе"
                    : `баланс ${depositPartyLive === "DOCTOR" ? "врача" : "клиники"}`}
                </span>
              </div>
              <label
                className={`flex items-center gap-1.5 text-xs text-[var(--text-secondary)] ${
                  depositBusy || !canEditOrder || previewMode
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-[var(--card-border)] bg-[var(--card-bg)]"
                  checked={depositApplied}
                  disabled={depositBusy || !canEditOrder || previewMode}
                  onChange={(e) => {
                    if (e.target.checked) void applyDepositOnOrder();
                    else void unapplyDepositOnOrder();
                  }}
                />
                <span className="whitespace-nowrap">
                  Учесть депозит в этой работе
                </span>
              </label>
            </div>
          ) : null}
          <OrderConstructionsEditor
            value={draftLines}
            onChange={setDraftLines}
            clinicId={clinicId || null}
            doctorId={doctorId || null}
          />
        </div>
      </div>
    </div>
  );

  const oeMidProsthetics = (
    <div
      className={`${editColWrap} flex min-h-0 flex-col gap-3 xl:h-full`}
    >
      <h3 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
        Протетика
      </h3>
      <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-3 crm-t2:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] crm-t2:items-stretch crm-t2:gap-0 crm-t2:divide-x crm-t2:divide-[var(--card-border)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-3 lg:pr-4">
          <div className="rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] p-2.5">
            <label
              className={`flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-strong)] ${
                prostheticsOrderedPersisting ? "opacity-70" : ""
              }`}
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-[var(--input-border)]"
                checked={prostheticsOrdered}
                disabled={prostheticsOrderedPersisting}
                onChange={(e) => {
                  const next = e.target.checked;
                  const prev = !next;
                  setProstheticsOrdered(next);
                  void persistProstheticsOrdered(next, prev);
                }}
              />
              Протетика заказана
            </label>
          </div>
          <div className="min-h-0 min-w-0 flex-1">
            <OrderProstheticsBlock
              value={prosthetics}
              onChange={setProsthetics}
              hideBlockTitle
              onOurSaleTotalChange={setProstheticsOurSaleRub}
            />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col lg:pl-4">
          <OrderProstheticsRequestsPanel
            orderId={initial.id}
            requests={initial.prostheticsRequests}
            canAccept={canAcceptChatCorrections}
          />
        </div>
      </div>
    </div>
  );

  const runParseInvoice = useCallback(async () => {
    setInvoiceParseBusy(true);
    setInvoiceParseHint(null);
    try {
      const res = await fetch(`/api/orders/${initial.id}/invoice-parse`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        warnings?: string[];
        summaryText?: string;
        totalRub?: number | null;
        invoiceNumberApplied?: boolean;
      };
      if (!res.ok) {
        setInvoiceParseHint(j.error ?? "Не удалось разобрать счёт");
        return;
      }
      const w = Array.isArray(j.warnings) ? j.warnings.filter(Boolean) : [];
      const baseHint =
        w.length > 0 ? w.join(" · ") : "Строки и сумма обновлены по файлу счёта";
      setInvoiceParseHint(
        j.invoiceNumberApplied
          ? `${baseHint} Номер счёта взят из PDF (поле было пустым).`
          : baseHint,
      );
      if (typeof j.summaryText === "string") {
        setInvoiceParsedSummaryText(j.summaryText);
      }
      if (j.totalRub != null && Number.isFinite(Number(j.totalRub))) {
        setInvoiceParsedTotalRubText(
          formatInvoiceTotalRubRuDisplay(Math.round(Number(j.totalRub))),
        );
      }
      router.refresh();
    } catch {
      setInvoiceParseHint("Сеть или сервер недоступны");
    } finally {
      setInvoiceParseBusy(false);
    }
  }, [initial.id, router]);

  const oeBottomSecondary = (
    <div className="min-w-0 space-y-3">
      <div
        className="scrollbar-none flex snap-x gap-1 overflow-x-auto border-b border-[var(--card-border)] p-1 pb-2 lg:flex-wrap lg:overflow-x-visible"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        role="tablist"
        aria-label="Документы и карточка"
      >
        {(
          [
            { key: "Документооборот" as const, label: "Документооборот" },
            { key: "Канбан/Кайтен" as const, label: kanbanTabLabel },
            { key: "История" as const, label: "История" },
          ] as const
        ).map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              className={
                active
                  ? "shrink-0 snap-start rounded-full bg-[var(--sidebar-blue)] px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"
                  : "shrink-0 snap-start rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)]"
              }
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          );
        })}
      </div>
      {activeTab === "Документооборот" ? (
        <div className={editColWrap}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Счёт, ЭДО и документы
            </h2>
            <button
              type="button"
              onClick={() => void copyInvoiceBlockText(invoiceCopyAllClipboardText)}
              title="Скопировать номер, юрлицо и ИНН"
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-strong)] shadow-sm hover:border-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)]"
            >
              Скопировать все
            </button>
          </div>
          {invoiceCopyToast ? (
            <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              {invoiceCopyToast}
            </p>
          ) : null}
          <fieldset
            disabled={!canEditOrder}
            className="min-w-0 border-0 p-0 disabled:opacity-[0.42]"
          >
          <div className="mt-3 grid grid-cols-1 items-start gap-4 crm-t2:grid-cols-2 crm-t3:grid-cols-[minmax(15rem,17.5rem)_minmax(0,1fr)_minmax(0,1fr)] crm-t3:gap-5">
            <div className="flex min-w-0 w-full max-w-md flex-col gap-3 crm-t3:max-w-none">
              <div className="flex w-full flex-col gap-1.5 [&_button]:w-full">
                <button
                  type="button"
                  onClick={() => void copyInvoiceBlockText(invoiceCopyClipboardText)}
                  title="Нажмите — скопировать в буфер обмена"
                  className="w-full truncate rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-left font-mono text-xs font-semibold text-[var(--text-strong)] shadow-sm outline-none hover:border-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)] focus-visible:ring-1 focus-visible:ring-sky-500 sm:text-sm"
                >
                  {invoiceCopyClipboardText}
                </button>
                <InvoiceCopyChip
                  label="Клиника"
                  value={clientLegalNameForCopy}
                  onCopy={(t) => void copyInvoiceBlockText(t)}
                />
                <InvoiceCopyChip
                  label="ИНН"
                  value={clientInnForCopy}
                  onCopy={(t) => void copyInvoiceBlockText(t)}
                />
              </div>
              <div className="w-full min-w-0 [&_details]:w-full [&_details]:max-w-none">
                <DocumentFlowCompositionSpoiler
                  lines={documentFlowCompositionRows}
                  onCopy={(t) => void copyInvoiceBlockText(t)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  ЭДО и бумаги
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={invoiceSaving || !canEditOrder}
                    aria-pressed={invoicePaperDocs}
                    title="Бумажные документы распечатаны"
                    onClick={() =>
                      void toggleInvoiceDocFlag(
                        "invoicePaperDocs",
                        !invoicePaperDocs,
                      )
                    }
                    className={
                      invoicePaperDocs
                        ? "rounded-md border border-stone-500 bg-stone-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 sm:text-sm"
                        : "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:opacity-50 sm:text-sm"
                    }
                  >
                    бум доки
                  </button>
                  <button
                    type="button"
                    disabled={invoiceSaving || !canEditOrder}
                    aria-pressed={invoiceSentToEdo}
                    title="Отправлен в ЭДО"
                    onClick={() =>
                      void toggleInvoiceDocFlag(
                        "invoiceSentToEdo",
                        !invoiceSentToEdo,
                      )
                    }
                    className={
                      invoiceSentToEdo
                        ? "rounded-md border border-cyan-500 bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50 sm:text-sm"
                        : "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:opacity-50 sm:text-sm"
                    }
                  >
                    отпр эдо
                  </button>
                  <button
                    type="button"
                    disabled={invoiceSaving || !canEditOrder}
                    aria-pressed={invoiceEdoSigned}
                    title="Подпись в ЭДО"
                    onClick={() =>
                      void toggleInvoiceDocFlag(
                        "invoiceEdoSigned",
                        !invoiceEdoSigned,
                      )
                    }
                    className={
                      invoiceEdoSigned
                        ? "rounded-md border border-indigo-500 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 sm:text-sm"
                        : "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:opacity-50 sm:text-sm"
                    }
                  >
                    пдпс эдо
                  </button>
                </div>
              </div>
              <div>
                <label
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                  htmlFor="oe-invoice-payment-notes"
                >
                  Комментарии к счёту и оплате
                </label>
                <textarea
                  id="oe-invoice-payment-notes"
                  className={`${inputClass} min-h-[7.5rem] w-full resize-y`}
                  rows={5}
                  maxLength={8000}
                  value={invoicePaymentNotes}
                  onChange={(e) => setInvoicePaymentNotes(e.target.value)}
                  placeholder="Условия оплаты, напоминания, переписка с бухгалтерией…"
                />
              </div>
            </div>
            <div className="w-full min-w-0 max-w-full space-y-3">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
                <button
                  type="button"
                  disabled={invoiceSaving}
                  aria-pressed={invoicePrinted}
                  onClick={() => void toggleInvoicePrinted(!invoicePrinted)}
                  className={
                    invoicePrinted
                      ? "rounded-md border border-violet-500 bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 sm:text-sm"
                      : "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:opacity-50 sm:text-sm"
                  }
                >
                  Счёт распечатан
                </button>
                {invoiceAttachmentId ? (
                  <a
                    href={`/api/orders/${initial.id}/attachments/${invoiceAttachmentId}`}
                    download
                    className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] sm:text-sm"
                  >
                    Скачать счёт
                  </a>
                ) : (
                  <span
                    className="cursor-not-allowed rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] opacity-60 sm:text-sm"
                    title="Сначала загрузите файл счёта"
                    aria-disabled="true"
                  >
                    Скачать счёт
                  </span>
                )}
                <OrderDocumentMailPanel
                  orderId={initial.id}
                  hasInvoice={Boolean(invoiceAttachmentId)}
                  mode="actions"
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-xs text-[var(--text-strong)] sm:text-sm">
                  <input
                    type="checkbox"
                    checked={invoiceIssued}
                    disabled={invoiceSaving}
                    onChange={(e) => void toggleInvoiceIssued(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[var(--input-border)]"
                  />
                  <span>Счёт выставлен</span>
                </label>
              </div>
              <div>
                <label className={labelClass} htmlFor="oe-invoice-number">
                  Номер счёта
                </label>
                <input
                  id="oe-invoice-number"
                  type="text"
                  aria-label="Номер счёта"
                  className={`${inputClass} max-w-[20rem]`}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Номер счёта"
                  maxLength={120}
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--text-body)]">
                  Файл счёта
                </p>
                <OrderInvoiceFileDrop
                  orderId={initial.id}
                  disabled={!canEditOrder}
                  onDone={async (res) => {
                    setError(null);
                    toast.success("Счёт загружен");
                    if (res?.id) setInvoiceAttachmentId(res.id);
                    if (res?.invoiceIssued !== undefined) {
                      setInvoiceIssued(Boolean(res.invoiceIssued));
                    }
                    if (res && "invoiceNumber" in res) {
                      setInvoiceNumber(res.invoiceNumber ?? "");
                    }
                    router.refresh();
                    await runParseInvoice();
                  }}
                  onFail={(msg) => {
                    setError(msg);
                    toast.error(msg);
                  }}
                  className="w-[16rem] max-w-full cursor-pointer rounded-md border border-dashed border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-center text-xs font-medium leading-snug text-[var(--text-secondary)] shadow-sm outline-none hover:border-[var(--sidebar-blue)] hover:text-[var(--text-strong)] focus-visible:ring-1 focus-visible:ring-sky-500 sm:text-sm"
                />
                {invoiceAttachmentId ? (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      disabled={invoiceDeleting || invoiceSaving}
                      onClick={() => void removeInvoiceAttachment()}
                      className="text-xs font-medium text-red-600 underline decoration-red-600/40 underline-offset-2 hover:decoration-red-600 disabled:opacity-50"
                    >
                      {invoiceDeleting ? "Удаление…" : "Удалить файл счёта"}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="border-t border-[var(--card-border)] pt-2">
                <OrderDocumentMailPanel
                  orderId={initial.id}
                  hasInvoice={Boolean(invoiceAttachmentId)}
                  mode="thread"
                  compact
                />
              </div>
            </div>
            <div className="w-full min-w-0 max-w-full space-y-3 border-t border-[var(--card-border)] pt-3 crm-t2:border-t-0 crm-t2:pt-0">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
                <button
                  type="button"
                  disabled={invoiceSaving}
                  aria-pressed={updPrinted}
                  onClick={() => void toggleUpdPrinted(!updPrinted)}
                  className={
                    updPrinted
                      ? "rounded-md border border-violet-500 bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 sm:text-sm"
                      : "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:opacity-50 sm:text-sm"
                  }
                >
                  УПД распечатан
                </button>
                {updAttachmentId ? (
                  <a
                    href={`/api/orders/${initial.id}/attachments/${updAttachmentId}`}
                    download
                    className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] sm:text-sm"
                  >
                    Скачать УПД
                  </a>
                ) : (
                  <span
                    className="cursor-not-allowed rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] opacity-60 sm:text-sm"
                    title="Сначала загрузите файл УПД"
                    aria-disabled="true"
                  >
                    Скачать УПД
                  </span>
                )}
                <span
                  className={
                    updAttachmentId
                      ? "rounded-md border border-emerald-500 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
                      : "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] sm:text-sm"
                  }
                >
                  УПД загружен
                </span>
              </div>
              <div>
                <label className={labelClass} htmlFor="oe-upd-number">
                  Номер УПД
                </label>
                <input
                  id="oe-upd-number"
                  type="text"
                  aria-label="Номер УПД"
                  className={`${inputClass} max-w-[20rem]`}
                  value={updNumber}
                  onChange={(e) => setUpdNumber(e.target.value)}
                  placeholder="Номер УПД"
                  maxLength={120}
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--text-body)]">
                  Файл УПД
                </p>
                <OrderInvoiceFileDrop
                  orderId={initial.id}
                  asUpd
                  disabled={!canEditOrder}
                  onDone={async (res) => {
                    setError(null);
                    toast.success("УПД загружен");
                    if (res?.id) setUpdAttachmentId(res.id);
                    if (res && "updNumber" in res && typeof res.updNumber === "string") {
                      setUpdNumber(res.updNumber);
                    }
                    router.refresh();
                  }}
                  onFail={(msg) => {
                    setError(msg);
                    toast.error(msg);
                  }}
                  className="w-[16rem] max-w-full cursor-pointer rounded-md border border-dashed border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-center text-xs font-medium leading-snug text-[var(--text-secondary)] shadow-sm outline-none hover:border-[var(--sidebar-blue)] hover:text-[var(--text-strong)] focus-visible:ring-1 focus-visible:ring-sky-500 sm:text-sm"
                />
                {updAttachmentId ? (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      disabled={invoiceDeleting || invoiceSaving}
                      onClick={() => void removeUpdAttachment()}
                      className="text-xs font-medium text-red-600 underline decoration-red-600/40 underline-offset-2 hover:decoration-red-600 disabled:opacity-50"
                    >
                      {invoiceDeleting ? "Удаление…" : "Удалить файл УПД"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 border-t border-[var(--card-border)] pt-4 crm-t2:grid-cols-2 crm-t2:gap-6">
            <div className="min-w-0 space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Выставлено по счёту
              </h3>
              {invoiceCompositionMismatch ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-400/80 bg-amber-500/10 px-3 py-2">
                  <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                    Состав работы не сходится со счётом
                  </p>
                  <button
                    type="button"
                    disabled={!canEditOrder || previewMode || mismatchAckBusy}
                    onClick={() => setMismatchConfirmOpen(true)}
                    className="rounded-md border border-amber-500/80 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-sm hover:bg-amber-200 disabled:opacity-50 dark:border-amber-400/60 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-900/60"
                  >
                    Подтвердить расхождение
                  </button>
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 crm-t3:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_minmax(0,11rem)] crm-t3:items-start crm-t3:gap-5">
                <div className="min-w-0">
                  <label
                    className={labelClass}
                    htmlFor="oe-invoice-parsed-summary"
                  >
                    ВЫСТАВЛЕНО (можно править вручную)
                  </label>
                  <textarea
                    id="oe-invoice-parsed-summary"
                    className={`${inputClass} mt-1 min-h-[5rem] w-full resize-y font-mono text-xs`}
                    rows={5}
                    maxLength={16000}
                    value={
                      invoiceParsedSummaryText ||
                      (parsedLinesForDisplay && parsedLinesForDisplay.length > 0
                        ? formatInvoiceParsedLinesAsText(parsedLinesForDisplay)
                        : "")
                    }
                    onChange={(e) => setInvoiceParsedSummaryText(e.target.value)}
                    onBlur={() => {
                      void flushInvoiceParsedToServer();
                    }}
                    placeholder="Строки из счёта или своя сводка"
                  />
                </div>
                <div className="min-w-0 lg:max-w-none">
                  <OrderPaymentSlipsBlock orderId={initial.id} />
                </div>
                <div className="min-w-0 lg:max-w-[12rem]">
                  <p className={labelClass}>Сумма по счёту</p>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputClass} mt-1 w-full`}
                    value={invoiceParsedTotalRubText}
                    onChange={(e) => setInvoiceParsedTotalRubText(e.target.value)}
                    onBlur={() => {
                      const raw = invoiceParsedTotalRubText;
                      const p = parseInvoiceTotalRubRuInput(raw);
                      let nextText = raw;
                      if (raw.trim() === "") {
                        nextText = "";
                      } else if (p != null) {
                        nextText = formatInvoiceTotalRubRuDisplay(p);
                      }
                      setInvoiceParsedTotalRubText(nextText);
                      invoiceParsedLiveRef.current = {
                        ...invoiceParsedLiveRef.current,
                        totalText: nextText,
                      };
                      void flushInvoiceParsedToServer();
                    }}
                    placeholder=""
                    aria-describedby="oe-invoice-total-rub-hint"
                  />
                  <p
                    id="oe-invoice-total-rub-hint"
                    className="mt-1 text-[0.65rem] leading-snug text-[var(--text-muted)]"
                  >
                    Целые рубли; после сохранения отобразятся с пробелами (например{" "}
                    <span className="font-mono">22 500 ₽</span>).
                  </p>
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!invoiceAttachmentId || invoiceParseBusy}
                    onClick={() => void runParseInvoice()}
                    className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                  >
                    {invoiceParseBusy ? "Разбор…" : "Разобрать PDF счёта"}
                  </button>
                  {!invoiceAttachmentId ? (
                    <span className="text-xs text-[var(--text-muted)]">
                      Сначала загрузите файл счёта слева.
                    </span>
                  ) : null}
                </div>
                {invoiceParseHint ? (
                  <p className="mt-2 text-xs text-[var(--text-body)]">
                    {invoiceParseHint}
                  </p>
                ) : null}
                {parsedLinesForDisplay && parsedLinesForDisplay.length > 0 ? (
                  <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-strong)]">
                    {parsedLinesForDisplay.map((l, i) => (
                      <li key={`${l.name}-${i}`}>
                        {l.code ? `${l.code} · ` : ""}
                        {l.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <div className="hidden min-w-0 lg:block" aria-hidden />
          </div>
          </fieldset>
        </div>
      ) : activeTab === "Канбан/Кайтен" ? (
        <div className={editColWrap}>
          {isDemoMode || !showKaitenExternalUi ? (
            <OrderDemoKanbanTab
              orderId={initial.id}
              initialColumn={initial.demoKanbanColumn}
              initialCardTypeId={initial.kaitenCardTypeId}
              cardTypes={demoKanbanCardTypes}
            />
          ) : (
            <OrderKaitenTab
              orderId={initial.id}
              kaitenCardId={initial.kaitenCardId}
              initialKaitenCardTitleLabel={initial.kaitenCardTitleLabel ?? null}
              kaitenCardUrl={initial.kaitenCardUrl}
              kanbanCardUrl={kanbanCardUrl}
              initialTrackLane={initial.kaitenTrackLane}
              initialKaitenBlocked={initial.kaitenBlocked}
              initialKaitenBlockReason={initial.kaitenBlockReason}
              kaitenDecideLater={initial.kaitenDecideLater === true}
              kaitenSyncError={initial.kaitenSyncError ?? null}
              kaitenCardTypeId={initial.kaitenCardTypeId ?? null}
            />
          )}
        </div>
      ) : (
        <div className={editColWrap}>
          <OrderRevisionHistory
            orderId={initial.id}
            orderNumber={initial.orderNumber}
          />
        </div>
      )}
    </div>
  );

  const openShipModalForMark = useCallback(() => {
    setShipModalMode("mark");
    setShipModalDraft("");
    setShipModalOpen(true);
  }, []);

  const openShipModalForEdit = useCallback(() => {
    setShipModalMode("edit");
    setShipModalDraft(shippedDescription);
    setShipModalOpen(true);
  }, [shippedDescription]);

  const workSentNarjadActions = useMemo(
    () => (
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        {adminShippedOtpr ? (
          <div className="flex max-w-[12rem] items-center gap-1.5 rounded-md border border-emerald-200/80 bg-emerald-50/55 px-1.5 py-1 dark:border-emerald-800/45 dark:bg-emerald-950/35 sm:max-w-[15rem]">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
              aria-hidden
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 opacity-[0.72]">
              <p className="truncate text-[10px] font-semibold leading-tight text-[var(--text-strong)] sm:text-[11px]">
                Работа отправлена
              </p>
              <button
                type="button"
                className="text-left text-[9px] font-medium text-[var(--sidebar-blue)] underline decoration-transparent hover:decoration-current"
                onClick={() => setAdminShippedOtpr(false)}
              >
                Снять
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!shippedDescription.trim()) {
                openShipModalForMark();
              } else {
                setAdminShippedOtpr(true);
              }
            }}
            className="shrink-0 whitespace-nowrap rounded-md border border-zinc-400/80 bg-zinc-500 px-2 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-zinc-600 dark:border-zinc-500 dark:bg-zinc-600 dark:hover:bg-zinc-500 sm:px-3 sm:text-xs"
          >
            Работа отправлена
          </button>
        )}
        {adminShippedOtpr && shippedDescription.trim() ? (
          <button
            type="button"
            className="hidden max-w-[10rem] truncate text-left text-[10px] font-medium text-[var(--sidebar-blue)] underline decoration-transparent hover:decoration-current sm:inline"
            title={shippedDescription.trim()}
            onClick={() => openShipModalForEdit()}
          >
            Текст отгрузки
          </button>
        ) : null}
      </div>
    ),
    [
      adminShippedOtpr,
      shippedDescription,
      openShipModalForMark,
      openShipModalForEdit,
    ],
  );

  const renderSaveButton = (mobileBar = false) => {
    if (!canEditOrder || previewMode) return null;
    return (
    <button
      type="button"
      onClick={save}
      disabled={saving || !doctorId.trim()}
      className={
        mobileBar
          ? "min-h-[44px] w-full rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50"
          : "rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50 sm:text-sm"
      }
    >
      {saving ? "Сохранение…" : "Сохранить наряд"}
    </button>
    );
  };

  const formInner = (
    <>
      {kaitenNewOrderWarn ? (
        <div
          className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          <p className="min-w-0 flex-1 leading-snug">{kaitenNewOrderWarn}</p>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-amber-900 underline decoration-transparent hover:decoration-current dark:text-amber-200"
            onClick={() => setKaitenNewOrderWarn(null)}
          >
            Скрыть
          </button>
        </div>
      ) : null}
    <div
      className={`w-full min-w-0 space-y-2.5 sm:space-y-3 ${isHarmony ? "order-edit-harmony-shell" : ""}`}
    >
      {!isOrderPageFramed ? (
        <div className="max-w-md">
          <label className="block" htmlFor="oe-order-number">
            <span className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Номер наряда
            </span>
            <input
              id="oe-order-number"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={orderNumberDraft}
              onChange={(e) => setOrderNumberDraft(e.target.value)}
              disabled={saving}
              className="mt-1.5 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 font-mono text-base font-semibold text-[var(--app-text)] outline-none focus-visible:ring-1 focus-visible:ring-sky-500 disabled:opacity-60 sm:text-sm"
            />
          </label>
          <p className="mt-1 text-[0.65rem] leading-snug text-[var(--text-muted)]">
            После «Сохранить наряд» и подтверждения — в списках, PDF и Kaiten.
          </p>
        </div>
      ) : null}
      <div
        className={
          isHarmony
            ? "order-edit-harmony-toolbar flex flex-nowrap items-center gap-1.5 overflow-x-auto px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2"
            : "flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-lg border border-[var(--card-border)] bg-gradient-to-b from-[var(--surface-subtle)] to-[var(--card-bg)] px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2"
        }
      >
        <label className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-1.5 text-[11px] text-[var(--text-strong)] sm:gap-1.5 sm:text-xs">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-[var(--input-border)]"
            checked={narjadPrinted}
            onChange={(e) => setNarjadPrinted(e.target.checked)}
          />
          <span>Наряд распечатан</span>
        </label>
        <OrderNarjadPrintTrigger
          orderId={initial.id}
          variant="custom"
          className="shrink-0 whitespace-nowrap rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-[11px] font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] sm:px-3 sm:text-xs"
          title="Диалог печати браузера (как Ctrl+P)"
        >
          Печать наряда
        </OrderNarjadPrintTrigger>
        <OrderKaitenQrModal
          orderId={initial.id}
          kaitenUrl={showKaitenExternalUi ? initial.kaitenCardUrl : null}
          kanbanUrl={kanbanCardUrl}
          labelFull="QR витрины"
        />
        {initial.sourceEmailCount > 0 ? (
          <button
            type="button"
            title={`Письма наряда (${initial.sourceEmailCount})`}
            aria-label="Письма наряда"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] sm:h-9 sm:px-2.5"
            onClick={() => setOrderMailOpen(true)}
          >
            <IconMail className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
          </button>
        ) : null}
        {workSentNarjadActions}
        {!previewMode ? (
          <div className="hidden shrink-0 shell-laptop:block">
            {renderSaveButton()}
          </div>
        ) : null}
      </div>

      {isOrderPageFramed ? (
        <OrderSecondaryTabsSpoiler
          title={
            isDemoMode
              ? "Документооборот · Канбан · История"
              : "Документооборот-Канбан-История"
          }
          defaultOpen={isAccountant}
          highlight={invoiceCompositionMismatch}
        >
          {oeBottomSecondary}
        </OrderSecondaryTabsSpoiler>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <MobileAwareDialog
        open={mismatchConfirmOpen}
        onClose={() => {
          if (!mismatchAckBusy) setMismatchConfirmOpen(false);
        }}
        title="Подтвердить расхождение"
        description="Состав заказа и сумма счёта различаются. Подтвердите, что это сделано намеренно."
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={mismatchAckBusy}
              onClick={() => setMismatchConfirmOpen(false)}
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={mismatchAckBusy}
              onClick={() => void ackInvoiceMismatch()}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {mismatchAckBusy ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Сохранение…
                </>
              ) : (
                "Подтвердить"
              )}
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-body)]">
          Индикация (янтарная рамка и пилюля «Корректировки») снимется, пока суммы
          счёта и состава не изменятся снова.
        </p>
      </MobileAwareDialog>

      {previewMode ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          Виртуальный наряд ИИ — только просмотр. Файлы не создаются.
        </p>
      ) : !canEditOrder ? (
        <p className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          Режим просмотра: нет права «Редактирование заказа». Изменения недоступны.
        </p>
      ) : null}

      <fieldset
        disabled={!canEditOrder || previewMode}
        className={`min-w-0 border-0 p-0 disabled:opacity-[0.88]${previewMode ? " pointer-events-none select-none" : ""}`}
      >

      {initial.kaitenBlocked && showKaitenExternalUi ? (
        <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-red-400/70 bg-red-950/40 px-3 py-2.5 text-sm text-red-50 shadow-sm dark:border-red-900/70 dark:bg-red-950/55">
          <div className="inline-flex min-w-0 items-center gap-1.5 font-medium leading-tight">
            <span aria-hidden>⛔</span>
            <span>Карточка Kaiten заблокирована</span>
          </div>
          {initial.kaitenBlockReason?.trim() ? (
            <p className="whitespace-pre-wrap text-xs leading-snug text-red-100/95">
              {initial.kaitenBlockReason.trim()}
            </p>
          ) : (
            <p className="text-xs leading-snug text-red-200/85">
              Причина не сохранена в CRM — откройте вкладку «Кайтен» и обновите
              данные или проверьте карточку в самой Kaiten.
            </p>
          )}
        </div>
      ) : null}

      {isOrderPageFramed ? (
        <>
          {orderLayoutCustomize && !isAccountant ? (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
              <span className="text-xs text-[var(--text-body)]">
                Кастомизация раскладки
              </span>
              <button
                type="button"
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                onClick={resetOrderLayoutToDefault}
              >
                Сбросить к умолчанию
              </button>
            </div>
          ) : null}
          {!isAccountant && !orderLayoutCustomize ? (
            <div
              className={`grid grid-cols-1 gap-3 crm-t2:grid-cols-12 crm-t2:items-start crm-t2:gap-3 ${isHarmony ? "order-edit-harmony-grid crm-t2:gap-4" : ""}`}
            >
              <div className="min-w-0 space-y-3 crm-t2:col-span-6">
                <div className="grid grid-cols-1 gap-3 crm-t3:grid-cols-2 crm-t3:items-start">
                  {oeColCustomer}
                  {oeColDeadlines}
                </div>
                {oeMidConstructions}
                {oeMidCorrections}
              </div>
              <div className="min-w-0 space-y-3 crm-t2:col-span-6">
                <div className="grid grid-cols-1 gap-3 crm-t3:grid-cols-2 crm-t3:items-start">
                  {oeColFiles}
                  {oeColClientNotes}
                </div>
                {oeMidProsthetics}
              </div>
            </div>
          ) : (
            <OrderEditPageLayoutGrid
              layout={orderLayoutForPageGrid}
              onLayoutChange={persistOrderLayout}
              customizeMode={orderLayoutCustomize && !isAccountant}
              blocks={{
                topCustomer: oeColCustomer,
                topDeadlines: oeColDeadlines,
                topFiles: oeColFiles,
                topClientNotes: oeColClientNotes,
                midConstructions: oeMidConstructions,
                midCorrections: oeMidCorrections,
                midProsthetics: oeMidProsthetics,
                bottomSecondary: null,
              }}
            />
          )}
          <div className="flex justify-end pt-4">
            {!isAccountant ? (
            <OrderEditCustomizeToggle
              active={orderLayoutCustomize}
              onClick={() => setOrderLayoutCustomize((v) => !v)}
            />
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 crm-t2:grid-cols-2 crm-t3:grid-cols-4 crm-t3:items-start crm-t3:gap-3">
            {oeColCustomer}
            {oeColDeadlines}
            {oeColFiles}
            {oeColClientNotes}
          </div>
          <div className="grid grid-cols-1 gap-3 crm-t2:grid-cols-12 crm-t2:items-stretch crm-t2:gap-3">
            <div className="min-w-0 crm-t2:col-span-6 crm-t2:flex crm-t2:h-full crm-t2:min-h-0 crm-t2:flex-col">
              {oeMidConstructions}
            </div>
            <div className="min-w-0 crm-t2:col-span-6 crm-t2:flex crm-t2:h-full crm-t2:min-h-0 crm-t2:flex-col">
              {oeMidProsthetics}
            </div>
            <div className="min-w-0 crm-t2:col-span-6 crm-t2:flex crm-t2:h-full crm-t2:min-h-0 crm-t2:flex-col">
              {oeMidCorrections}
            </div>
          </div>
        </>
      )}
      </fieldset>
    </div>
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shell-laptop:hidden">
      <div className="flex gap-2">{renderSaveButton(true)}</div>
    </div>
    <div
      className="h-[calc(3.25rem+env(safe-area-inset-bottom))] shell-laptop:hidden"
      aria-hidden="true"
    />
    {shipModalOpen ? (
      <div
        className="fixed inset-0 z-[280] flex items-center justify-center bg-zinc-900/45 p-4"
        role="presentation"
        onClick={() => setShipModalOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="oe-ship-modal-title"
          className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="oe-ship-modal-title"
            className="text-sm font-semibold text-[var(--app-text)]"
          >
            {shipModalMode === "mark"
              ? "Что отгружено?"
              : "Текст «Отгружено»"}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {shipModalMode === "mark"
              ? "Кратко опишите фактическую отгрузку. Можно отметить отправку и без текста."
              : "Изменения сохранятся при «Сохранить наряд»."}
          </p>
          <textarea
            className={`${inputClass} mt-3 min-h-[5rem] resize-y`}
            rows={4}
            maxLength={4000}
            value={shipModalDraft}
            onChange={(e) => setShipModalDraft(e.target.value)}
            placeholder="Например: модели + прикусной валик…"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
              onClick={() => setShipModalOpen(false)}
            >
              Отмена
            </button>
            {shipModalMode === "mark" ? (
              <button
                type="button"
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                onClick={() => {
                  setAdminShippedOtpr(true);
                  setShipModalOpen(false);
                }}
              >
                Без текста
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
              onClick={() => {
                const t = shipModalDraft.trim();
                setShippedDescription(t);
                if (shipModalMode === "mark") {
                  setAdminShippedOtpr(true);
                }
                setShipModalOpen(false);
              }}
            >
              {shipModalMode === "mark" ? "Сохранить и отметить" : "Сохранить текст"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    {orderMailOpen ? (
      <OrderSourceEmailsModal
        orderId={initial.id}
        orderNumber={orderNumberDraft.trim() || initial.orderNumber}
        onClose={() => setOrderMailOpen(false)}
      />
    ) : null}
    </>
  );

  const orderPageHeaderAccessory = orderPageFrame ? (
    <div className="relative z-50 flex min-w-0 max-w-full flex-nowrap items-center gap-2">
      {showKaitenExternalUi ? (
      <KaitenHeaderPillMenu
        orderId={initial.id}
        kaitenCardId={initial.kaitenCardId}
        initialColumnTitle={initial.kaitenColumnTitle}
        isDemoMode={isDemoMode}
        demoKanbanColumn={initial.demoKanbanColumn}
        demoCardTypeName={initial.kaitenCardTypeName}
      />
      ) : null}
      <UrgentPillMenu
        value={urgentSelection}
        onChange={setUrgentSelection}
      />
      <OrderHeadlinePills
        prostheticsOrdered={prostheticsOrdered}
        hasInvoiceAttachment={Boolean(invoiceAttachmentId)}
        invoiceNumber={invoiceNumber}
        invoicePrinted={invoicePrinted}
        hasUpdAttachment={Boolean(updAttachmentId)}
        updNumber={updNumber}
        updPrinted={updPrinted}
        adminShippedOtpr={adminShippedOtpr}
      />
    </div>
  ) : null;

  if (orderPageFrame) {
    return (
      <>
        <ModuleFrame
          title={orderPageFrame.title}
          titleAlign="center"
          titleClassName="text-center text-lg sm:text-xl lg:text-xl"
          rootClassName="!gap-3 !pt-3 sm:!pt-4 md:!pt-5 lg:!pt-5 !pb-6"
          headerClassName="sticky top-0 z-40 -mx-3 bg-[var(--app-bg)] px-3 pb-1.5 pt-1 sm:-mx-6 sm:px-6 sm:pb-2 lg:-mx-10 lg:px-10"
          titleSubline={
            <button
              type="button"
              onClick={() => {
                setOrderNumberModalError(null);
                setOrderNumberModalDraft(
                  orderNumberDraft.trim() || initial.orderNumber,
                );
                setOrderNumberModalOpen(true);
              }}
              className="border-0 bg-transparent p-0 text-center text-[0.65rem] font-normal text-[var(--text-muted)] underline decoration-transparent underline-offset-2 hover:decoration-current"
            >
              Изменить номер
            </button>
          }
          description={orderPageFrame.description ?? undefined}
          titleAccessory={orderPageHeaderAccessory}
        >
          {formInner}
          {!previewMode ? (
          <div className="mt-10 flex justify-start border-t border-[var(--card-border)] pt-6">
            <button
              type="button"
              onClick={() => {
                setArchiveErr(null);
                setArchiveConfirmOpen(true);
              }}
              className="border-0 bg-transparent p-0 text-left text-sm text-[var(--text-muted)] underline decoration-transparent underline-offset-2 hover:text-red-600 hover:decoration-current dark:hover:text-red-400"
            >
              Удалить наряд…
            </button>
          </div>
          ) : null}
        </ModuleFrame>
        {orderNumberModalOpen ? (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4"
            role="presentation"
            onClick={() => {
              if (!savingOrderNumber) closeOrderNumberModal();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="oe-order-number-modal-title"
              className="max-h-[min(90dvh,32rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="oe-order-number-modal-title"
                className="text-base font-semibold text-[var(--app-text)]"
              >
                Номер наряда
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Обновится в списках, PDF и заголовке карточки Kaiten (если
                привязана).
              </p>
              <label className={`${labelClass} mt-4`} htmlFor="oe-order-number-modal">
                Номер
              </label>
              <input
                id="oe-order-number-modal"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={orderNumberModalDraft}
                onChange={(e) => setOrderNumberModalDraft(e.target.value)}
                disabled={savingOrderNumber}
                className={`${inputClass} mt-1.5 font-mono text-sm font-semibold`}
              />
              {orderNumberModalError ? (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
                  {orderNumberModalError}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeOrderNumberModal}
                  disabled={savingOrderNumber}
                  className="rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50 sm:text-sm"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => void saveOrderNumberFromModal()}
                  disabled={savingOrderNumber}
                  className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50 sm:text-sm"
                >
                  {savingOrderNumber ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <ContinueWorkSearchDialog
          open={continuationSearchOpen}
          onClose={() => setContinuationSearchOpen(false)}
          doctorId={doctorId.trim() || null}
          patientName={patientName}
          clinicId={
            clinicId === ORDER_CLINIC_PRIVATE ? null : clinicId.trim() || null
          }
          excludeOrderId={initial.id}
          onPick={(o: PickedOrder) => {
            setContinuesFromOrderId(o.id);
            setContinuesFromOrderNumber(o.number);
            setContinuationSearchOpen(false);
          }}
        />
        {archiveConfirmOpen ? (
          <div
            className="fixed inset-0 z-[290] flex items-center justify-center bg-zinc-900/45 p-4"
            role="presentation"
            onClick={() => {
              if (!archiveBusy) setArchiveConfirmOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="oe-archive-modal-title"
              className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="oe-archive-modal-title"
                className="text-sm font-semibold text-[var(--app-text)]"
              >
                Удалить наряд?
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                Наряд уйдёт в архив: исчезнет из списка заказов и с канбана, карточка
                Kaiten будет перенесена в архив (если настроен API). Номер наряда не перейдёт к
                другим нарядам. Потом можно восстановить из раздела «Архив».
              </p>
              {archiveErr ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {archiveErr}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={archiveBusy}
                  className="rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
                  onClick={() => setArchiveConfirmOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={archiveBusy}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                  onClick={() => void confirmArchiveOrder()}
                >
                  {archiveBusy ? "Удаление…" : "В архив"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return formInner;
}
