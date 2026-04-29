"use client";

import Link from "next/link";
import { OrderNarjadPrintTrigger } from "@/components/orders/OrderNarjadPrintTrigger";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isoToDatetimeLocal,
  localDateTimeToIso,
} from "@/lib/datetime-local";
import {
  clampDueLocalToMin,
  earliestDueGridLocalFromCreatedAt,
  snapDatetimeLocalToDueGrid,
} from "@/lib/order-due-datetime";
import { DueDatetimeComboPicker } from "@/components/ui/DueDatetimeComboPicker";
import {
  clinicComboboxSearchPrefixes,
  clinicSelectLabel,
  orderDoctorsForClinicCombobox,
  ORDER_CLINIC_PRIVATE,
} from "@/lib/clients-order-ui";
import {
  legalEntitySelectFromClinicBilling,
  ORDER_PAYMENT_SVERKA,
  sverkaPaymentSelectLabel,
  withExtraSelectOption,
} from "@/lib/order-clinic-client-fields";
import {
  orderPriceListKindRu,
  resolvedOrderPriceListKindFromContractors,
} from "@/lib/order-price-list-from-contractors";
import { lineAmountRub } from "@/lib/format-order-construction";
import {
  normalizeLegacyLabWorkStatus,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import { KaitenHeaderPillMenu } from "@/components/orders/KaitenHeaderPillMenu";
import { UrgentPillMenu } from "@/components/orders/UrgentPillMenu";
import { OrderHeadlinePills } from "@/components/orders/OrderHeadlinePills";
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
import { PrefixSearchCombobox } from "@/components/ui/PrefixSearchCombobox";
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
  formatInvoiceParsedLinesAsText,
  normalizeInvoiceParsedLines,
} from "@/lib/invoice-parsed-types";
import {
  formatInvoiceTotalRubRuDisplay,
  formatInvoiceTotalRubRuDisplayNullable,
  parseInvoiceTotalRubRuInput,
} from "@/lib/format-invoice-total-rub-display";
import { CRM_ORDER_ARCHIVED_EVENT } from "@/lib/crm-client-events";

type CourierOption = { id: string; name: string };

const INVOICE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
/** Лимит ожидания ответа при больших PDF и сетевых задержках. */
const INVOICE_UPLOAD_CLIENT_TIMEOUT_MS = 90_000;

type InvoiceAttachmentUploadOk = {
  id: string;
  fileName: string;
  size: number;
  createdAt?: string;
  uploadedToKaitenAt: string | null;
  invoiceNumber?: string | null;
  invoiceIssued?: boolean;
  warning?: string;
};

/** Компактная зона: файл счёта в наряд (вложения), перетаскивание / выбор / Ctrl+V при фокусе. */
function OrderInvoiceFileDrop({
  orderId,
  onDone,
  onFail,
  className,
}: {
  orderId: string;
  onDone: (result?: InvoiceAttachmentUploadOk) => void | Promise<void>;
  onFail: (msg: string) => void;
  /** Доп. классы корневого блока (например ширина на вкладке). */
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  /** Сообщение прямо под зоной загрузки (ошибка «в шапке» формы легко не заметить). */
  const [localHint, setLocalHint] = useState<string | null>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter(
        (f) => f.size > 0 && f.size <= INVOICE_UPLOAD_MAX_BYTES,
      );
      if (arr.length === 0) {
        const msg = "Нет подходящего файла (макс. 10 МБ)";
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
        for (const file of arr) {
          const safeName = encodeURIComponent(file.name || "file");
          setLocalHint("Загрузка и сохранение на сервере…");
          const res = await fetch(`/api/orders/${orderId}/attachments`, {
            method: "POST",
            credentials: "include",
            headers: {
              "content-type": "application/octet-stream",
              "x-upload-filename": safeName,
              "x-upload-mime": file.type || "application/octet-stream",
              "x-as-invoice": "1",
            },
            body: file,
            signal: ctrl.signal,
          });
          const rawText = await res.text();
          let j: {
            error?: string;
            details?: string;
            id?: string;
          } & Partial<InvoiceAttachmentUploadOk> = {};
          if (rawText.trim()) {
            try {
              j = JSON.parse(rawText) as typeof j;
            } catch {
              j = {};
            }
          }
          if (!res.ok) {
            const base = j.error ?? "Ошибка загрузки";
            const extra =
              typeof j.details === "string" && j.details.trim()
                ? ` (${j.details.trim()})`
                : "";
            throw new Error(`${base}${extra}`);
          }
          if (!j.id || typeof j.id !== "string") {
            throw new Error(
              "Сервер вернул ответ без id вложения — обновите страницу и попробуйте снова",
            );
          }
          lastOk = j as InvoiceAttachmentUploadOk;
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
    [orderId, onDone, onFail],
  );

  return (
    <div className="min-w-0 space-y-1.5">
    <div
      tabIndex={0}
      role="group"
      aria-label="Загрузка файла счёта"
      title="Клик — выбрать файл; перетащите файл сюда; при фокусе — Ctrl+V из буфера"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onPaste={(e) => {
        const fl = e.clipboardData?.files;
        if (fl?.length) {
          e.preventDefault();
          void upload(fl);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const fl = e.dataTransfer?.files;
        if (fl?.length) void upload(fl);
      }}
      onClick={() => {
        if (!busy) inputRef.current?.click();
      }}
      className={
        className ??
        "max-w-[11rem] cursor-pointer rounded-md border border-dashed border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-center text-[10px] font-medium leading-snug text-[var(--text-secondary)] shadow-sm outline-none hover:border-[var(--sidebar-blue)] hover:text-[var(--text-strong)] focus-visible:ring-1 focus-visible:ring-sky-500 sm:max-w-[13rem] sm:text-xs"
      }
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
      {busy ? "Загрузка…" : "Файл счёта · ↓ или Ctrl+V"}
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

const PAYMENT_OPTIONS = [
  "Выбрать из списка",
  "Не выбрано",
  "Ожидает оплаты",
  "Частично оплачено",
  "Оплачено",
  ORDER_PAYMENT_SVERKA,
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

type DoctorRow = {
  id: string;
  fullName: string;
  orderPriceListKind?: "MAIN" | "CUSTOM" | null;
};
type ClinicRow = {
  id: string;
  name: string;
  address?: string | null;
  isActive?: boolean;
  legalFullName?: string | null;
  billingLegalForm?: "IP" | "OOO" | null;
  orderPriceListKind?: "MAIN" | "CUSTOM" | null;
  worksWithReconciliation?: boolean;
  reconciliationFrequency?: "MONTHLY_1" | "MONTHLY_2" | null;
  doctors: DoctorRow[];
};

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-base text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:text-sm";
const comboboxClass = `${inputClass} cursor-text`;
const labelClass = "block text-sm font-medium text-[var(--text-body)]";
const checkboxLabelClassEdit =
  "flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-strong)] select-none sm:text-sm";
const checkboxInputClassEdit =
  "h-3.5 w-3.5 shrink-0 rounded border-[var(--input-border)] text-[var(--sidebar-blue)] focus:ring-sky-500";
/** Колонка сетки наряда (как секции в «Новом заказе», без «плавающего» центрирования). */
const editColWrap =
  "min-w-0 space-y-0 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5 sm:p-3";
/** То же для верхней четырёхколоночной сетки: выравнивание по высоте строки. */
const editMainCol = `${editColWrap} flex min-h-0 flex-col xl:h-full`;

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
  /** Когда зашла работа (поступление); null — как при создании без явной даты */
  workReceivedAt: string | null;
  createdAt: string;
  invoiceIssued: boolean;
  invoiceNumber: string | null;
  invoicePaperDocs: boolean;
  invoiceSentToEdo: boolean;
  invoiceEdoSigned: boolean;
  invoicePrinted: boolean;
  narjadPrinted: boolean;
  adminShippedOtpr: boolean;
  /** Текст «что отгружено» при отметке отправки */
  shippedDescription: string | null;
  invoiceParsedLines: unknown;
  invoiceParsedTotalRub: number | null;
  invoiceParsedSummaryText: string | null;
  invoicePaymentNotes: string | null;
  orderPriceListKind: "MAIN" | "CUSTOM" | null;
  orderPriceListNote: string | null;
  prostheticsOrdered: boolean;
  correctionTrack: OrderCorrectionTrack | null;
  registeredByLabel: string | null;
  courierId: string | null;
  courierName: string | null;
  courierPickupId: string | null;
  courierPickupName: string | null;
  courierDeliveryId: string | null;
  courierDeliveryName: string | null;
  legalEntity: string | null;
  payment: string | null;
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
    } | null;
    materialId: string | null;
    shade: string | null;
    quantity: number;
    unitPrice: number | null;
    teethFdi: unknown;
    bridgeFromFdi: string | null;
    bridgeToFdi: string | null;
    arch: string | null;
  }>;
  prosthetics: OrderProstheticsV1;
  kaitenCardId: number | null;
  kaitenDecideLater?: boolean;
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
  /** Корректировки из чата (префикс «!!!») */
  chatCorrections: Array<{
    id: string;
    text: string;
    source: "KAITEN" | "DEMO_KANBAN";
    createdAt: string;
    resolvedAt: string | null;
    rejectedAt: string | null;
  }>;
  /** Заявки по протетике из чата (префикс «???») */
  prostheticsRequests: Array<{
    id: string;
    text: string;
    source: "KAITEN" | "DEMO_KANBAN";
    createdAt: string;
    resolvedAt: string | null;
    rejectedAt: string | null;
  }>;
};

/** Вкладки документооборота / Kaiten / истории (на странице наряда — над нижней панелью). */
const SECONDARY_TABS = ["Документооборот", "Кайтен", "История"] as const;
export type OrderEditTab = (typeof SECONDARY_TABS)[number];
type EditTab = OrderEditTab;

function normalizeSecondaryTab(t: EditTab | undefined): EditTab {
  if (t === "Кайтен" || t === "История" || t === "Документооборот") return t;
  return "Документооборот";
}

export function OrderEditForm({
  initial,
  initialActiveTab,
  isDemoMode = false,
  demoKanbanCardTypes = [],
  canAcceptChatCorrections = false,
  /** Подпись вкладки доски: лаб=«Кайтен» (кроме демо), коммерция=«Канбан» — с сервера, без NEXT_PUBLIC. */
  boardTabLabel: boardTabLabelProp,
  orderPageFrame,
}: {
  initial: OrderEditInitial;
  initialActiveTab?: EditTab;
  isDemoMode?: boolean;
  demoKanbanCardTypes?: Array<{ id: string; name: string }>;
  /** Принять корректировки из чата (роль админ / ст. админ / фин. менеджер). */
  canAcceptChatCorrections?: boolean;
  boardTabLabel?: "Канбан" | "Кайтен";
  /** Шапка модуля: этап работы, срочность, пилюли-индикаторы и «Сохранить». */
  orderPageFrame?: {
    title: string;
    /** Необязательный серый текст под заголовком (обычно не показываем). */
    description?: string;
  };
}) {
  const boardTabLabel =
    boardTabLabelProp ?? (isDemoMode ? "Канбан" : "Кайтен");
  const isOrderPageFramed = orderPageFrame != null;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EditTab>(() =>
    normalizeSecondaryTab(initialActiveTab),
  );

  useEffect(() => {
    setActiveTab(normalizeSecondaryTab(initialActiveTab));
  }, [initialActiveTab]);

  useEffect(() => {
    setOrderNumberDraft(initial.orderNumber);
  }, [initial.id, initial.orderNumber]);

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
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [clientOrderText, setClientOrderText] = useState(
    initial.clientOrderText ?? "",
  );
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

  const [dueLocal, setDueLocal] = useState(() => {
    const raw = snapDatetimeLocalToDueGrid(isoToDatetimeLocal(initial.dueDate));
    if (!raw) return "";
    return clampDueLocalToMin(raw, dueDateMinLocal);
  });
  const [dueAdminsLocal, setDueAdminsLocal] = useState(() => {
    const raw = snapDatetimeLocalToDueGrid(
      isoToDatetimeLocal(initial.dueToAdminsAt),
    );
    if (!raw) return "";
    return clampDueLocalToMin(raw, dueDateMinLocal);
  });

  useEffect(() => {
    const min = earliestDueGridLocalFromCreatedAt(initial.createdAt);
    const rawDue = snapDatetimeLocalToDueGrid(isoToDatetimeLocal(initial.dueDate));
    setDueLocal(rawDue ? clampDueLocalToMin(rawDue, min) : "");
    const rawAdm = snapDatetimeLocalToDueGrid(
      isoToDatetimeLocal(initial.dueToAdminsAt),
    );
    setDueAdminsLocal(rawAdm ? clampDueLocalToMin(rawAdm, min) : "");
  }, [
    initial.id,
    initial.createdAt,
    initial.dueDate,
    initial.dueToAdminsAt,
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

  const [correctionTrack, setCorrectionTrack] =
    useState<OrderCorrectionTrack | null>(initial.correctionTrack);
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
  const [payment, setPayment] = useState(
    initial.payment?.trim() || PAYMENT_OPTIONS[0],
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
  const [prosthetics, setProsthetics] = useState<OrderProstheticsV1>(
    () => initial.prosthetics,
  );
  const [orderNumberDraft, setOrderNumberDraft] = useState(
    () => initial.orderNumber,
  );
  const [orderNumberModalOpen, setOrderNumberModalOpen] = useState(false);
  const [orderNumberModalDraft, setOrderNumberModalDraft] = useState("");
  const [orderNumberModalError, setOrderNumberModalError] = useState<
    string | null
  >(null);
  const [savingOrderNumber, setSavingOrderNumber] = useState(false);
  const [saveSideNotice, setSaveSideNotice] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

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

  const clinicComboboxOptions = useMemo(
    () => [
      ...clinics.map((c) => ({
        value: c.id,
        label: clinicSelectLabel(c),
        searchPrefixes: clinicComboboxSearchPrefixes(c),
      })),
      { value: ORDER_CLINIC_PRIVATE, label: "Частная практика" },
    ],
    [clinics],
  );

  const doctorComboboxOptions = useMemo(
    () =>
      doctorsForClinic.map((d) => ({ value: d.id, label: d.fullName })),
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

  const onClinicChange = useCallback((id: string) => {
    setClinicId(id);
    setDoctorId("");
  }, []);

  const prevClinicIdForLegalRef = useRef<string | null>(null);

  const selectedClinic = useMemo(
    () =>
      clinicId && clinicId !== ORDER_CLINIC_PRIVATE
        ? clinics.find((c) => c.id === clinicId)
        : undefined,
    [clinicId, clinics],
  );

  const selectedDoctor = useMemo(() => {
    if (!doctorId) return undefined;
    const fromAll = allDoctors.find((d) => d.id === doctorId);
    if (fromAll) return fromAll;
    return doctorsForClinic.find((d) => d.id === doctorId);
  }, [doctorId, allDoctors, doctorsForClinic]);

  const resolvedOrderPriceListKind = useMemo(() => {
    const cid =
      clinicId && clinicId !== ORDER_CLINIC_PRIVATE ? clinicId : null;
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
      clinicKind: selectedClinic?.orderPriceListKind ?? null,
    });
  }, [clinicId, selectedClinic, doctorId, allDoctors]);

  const paymentSelectOptions = useMemo(() => {
    const includeSverka = selectedClinic?.worksWithReconciliation === true;
    const noSverka = PAYMENT_OPTIONS.filter((p) => p !== ORDER_PAYMENT_SVERKA);
    const base = includeSverka
      ? [...noSverka, ORDER_PAYMENT_SVERKA]
      : [...noSverka];
    return withExtraSelectOption(base, payment);
  }, [selectedClinic, payment]);

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
    if (row.worksWithReconciliation === true) {
      setPayment((prev) => {
        const unset =
          prev === PAYMENT_OPTIONS[0] || prev === "Не выбрано";
        return unset ? ORDER_PAYMENT_SVERKA : prev;
      });
    }
  }, [clinicId, clinics]);

  useEffect(() => {
    if (payment !== ORDER_PAYMENT_SVERKA) return;
    if (!clinicId || clinicId === ORDER_CLINIC_PRIVATE) {
      setPayment(PAYMENT_OPTIONS[0]);
      return;
    }
    const row = clinics.find((x) => x.id === clinicId);
    if (!row) return;
    if (row.worksWithReconciliation === true) return;
    setPayment(PAYMENT_OPTIONS[0]);
  }, [clinicId, clinics, payment]);

  const financePreviewTotal = useMemo(() => {
    let sum = 0;
    const payload = draftToConstructionPayload(draftLines);
    for (const row of payload as Array<Record<string, unknown>>) {
      const qty = typeof row.quantity === "number" ? row.quantity : 1;
      const p = row.unitPrice;
      if (p == null || typeof p !== "number" || Number.isNaN(p)) continue;
      sum += lineAmountRub(qty, p);
    }
    return Math.round(sum * urgentPriceMult * 100) / 100;
  }, [draftLines, urgentPriceMult]);

  /** Сумма по счёту (выставлено) заполнена и расходится с итого по строкам состава (с учётом срочности). */
  const invoiceCompositionMismatch = useMemo(() => {
    if (invoiceParsedTotalRub == null) return false;
    const compositionRub = Math.round(financePreviewTotal);
    const invoiceRub = invoiceParsedTotalRub;
    return Math.abs(compositionRub - invoiceRub) > 1;
  }, [financePreviewTotal, invoiceParsedTotalRub]);

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
      setOk(true);
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
    setSaveSideNotice(null);
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
        setSaveSideNotice(
          `Номер обновлён. Заголовок в Kaiten не обновился: ${data.kaitenTitleSyncError}`,
        );
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
    setOk(false);
    setSaveSideNotice(null);
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
                clampDueLocalToMin(
                  snapDatetimeLocalToDueGrid(dueLocal),
                  dueDateMinLocal,
                ),
              )
            : null,
          dueToAdminsAt: dueAdminsLocal.trim()
            ? localDateTimeToIso(
                clampDueLocalToMin(
                  snapDatetimeLocalToDueGrid(dueAdminsLocal),
                  dueDateMinLocal,
                ),
              )
            : null,
          invoiceIssued,
          invoiceNumber: invoiceNumber.trim() || null,
          invoicePaperDocs,
          invoiceSentToEdo,
          invoiceEdoSigned,
          invoicePrinted,
          narjadPrinted,
          adminShippedOtpr,
          shippedDescription: shippedDescription.trim() || null,
          invoicePaymentNotes: invoicePaymentNotes.trim() || null,
          invoiceParsedSummaryText: invoiceParsedSummaryText.trim() || null,
          invoiceParsedTotalRub: invoiceParsedTotalRub,
          orderPriceListNote: initial.orderPriceListNote,
          prostheticsOrdered,
          correctionTrack,
          courierPickupId: courierPickupId.trim() || null,
          courierDeliveryId: courierDeliveryId.trim() || null,
          courierId: courierPickupId.trim() || null,
          legalEntity:
            legalEntity === LEGAL_ENTITIES[0] ? null : legalEntity.trim(),
          payment: payment === PAYMENT_OPTIONS[0] ? null : payment.trim(),
          ...(payment === ORDER_PAYMENT_SVERKA
            ? { excludeFromReconciliation }
            : { excludeFromReconciliation: false }),
          hasScans,
          hasCt,
          hasMri,
          hasPhoto,
          additionalSourceNotes: additionalSourceNotes.trim() || null,
          constructions,
          prosthetics,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        kaitenTitleSyncError?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить");
        return;
      }
      if (data.kaitenTitleSyncError) {
        setSaveSideNotice(
          `Наряд сохранён. Заголовок в Kaiten не обновился: ${data.kaitenTitleSyncError}`,
        );
      }
      setOk(true);
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
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
    invoiceIssued,
    invoiceNumber,
    invoicePaperDocs,
    invoiceSentToEdo,
    invoiceEdoSigned,
    invoicePrinted,
    narjadPrinted,
    adminShippedOtpr,
    shippedDescription,
    invoicePaymentNotes,
    invoiceParsedSummaryText,
    invoiceParsedTotalRub,
    initial.orderPriceListNote,
    prostheticsOrdered,
    correctionTrack,
    courierPickupId,
    courierDeliveryId,
    legalEntity,
    payment,
    excludeFromReconciliation,
    hasScans,
    hasCt,
    hasMri,
    hasPhoto,
    additionalSourceNotes,
    draftLines,
    prosthetics,
    router,
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
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [orderLayoutPrefs, setOrderLayoutPrefs] = useState<OrderEditLayoutV1>(
    () => defaultOrderEditLayout(),
  );
  const [orderLayoutCustomize, setOrderLayoutCustomize] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const j = (await res.json()) as { user?: { id?: string } | null };
        if (!cancelled) setSessionUserId(j.user?.id ?? null);
      } catch {
        if (!cancelled) setSessionUserId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orderPageFrame) return;
    setOrderLayoutPrefs(loadOrderEditLayout(sessionUserId));
  }, [orderPageFrame, sessionUserId]);

  const persistOrderLayout = useCallback(
    (next: OrderEditLayoutV1) => {
      setOrderLayoutPrefs(next);
      saveOrderEditLayout(sessionUserId, next);
    },
    [sessionUserId],
  );

  const resetOrderLayoutToDefault = useCallback(() => {
    clearOrderEditLayout(sessionUserId);
    const d = defaultOrderEditLayout();
    setOrderLayoutPrefs(d);
    saveOrderEditLayout(sessionUserId, d);
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
          onClick={() => setCorrectionTrack(v)}
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
      <section className="border-b border-[var(--card-border)] pb-2">
        <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Заказчик
        </h3>
        <div className="space-y-2">
          <div>
            <label className={labelClass} htmlFor="oe-clinic">
              Клиника
            </label>
            <PrefixSearchCombobox
              id="oe-clinic"
              className={comboboxClass}
              options={clinicComboboxOptions}
              value={clinicId}
              onChange={onClinicChange}
              placeholder="Название клиники, ООО или юр. наименование…"
              emptyOptionLabel="Выбрать"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="oe-doctor">
              Врач
            </label>
            <PrefixSearchCombobox
              id="oe-doctor"
              className={comboboxClass}
              options={doctorComboboxOptions}
              value={doctorId}
              onChange={setDoctorId}
              disabled={clinicId === ""}
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
      <section className="pt-2">
        <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Пациент
        </h3>
        <div className="space-y-2">
          <div>
            <label className={labelClass} htmlFor="oe-patient">
              ФИО пациента
            </label>
            <input
              id="oe-patient"
              type="text"
              className={inputClass}
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                value={
                  (paymentSelectOptions as string[]).includes(payment)
                    ? payment
                    : paymentSelectOptions[0] ?? PAYMENT_OPTIONS[0]
                }
                onChange={(e) => setPayment(e.target.value)}
              >
                {paymentSelectOptions.map((o) => (
                  <option key={o} value={o}>
                    {o === ORDER_PAYMENT_SVERKA
                      ? sverkaPaymentSelectLabel(
                          selectedClinic?.reconciliationFrequency,
                        )
                      : o}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2 border-t border-[var(--card-border)] pt-2">
            <div>
              <p className={labelClass}>Прайс</p>
              <div
                className="mt-1 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-sm text-[var(--text-strong)]"
                title="Значение подставляется из карточки врача и клиники при сохранении наряда"
              >
                {orderPriceListKindRu(resolvedOrderPriceListKind)}
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Настраивается в карточке клиники и врача (как юрлицо): приоритет у
                врача, иначе — у клиники.
              </p>
            </div>
            {payment === ORDER_PAYMENT_SVERKA ? (
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
            value={dueLocal}
            minLocal={dueDateMinLocal}
            title="Срок лабораторный (8:00–23:30, шаг 30 мин)"
            className="w-full max-w-full"
            onChange={(raw) => {
              setDueLocal(raw === "" ? "" : snapDatetimeLocalToDueGrid(raw));
            }}
          />
          <DueDatetimeComboPicker
            id="oe-due-admins"
            label="Запись"
            labelPlacement="inside"
            value={dueAdminsLocal}
            minLocal={dueDateMinLocal}
            title="Дата записи пациента (8:00–23:30, шаг 30 мин)"
            className="w-full max-w-full"
            onChange={(raw) => {
              setDueAdminsLocal(
                raw === "" ? "" : snapDatetimeLocalToDueGrid(raw),
              );
            }}
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
  );

  const oeColFiles = (
    <div className={editMainCol}>
      <section className="flex min-h-0 flex-1 flex-col">
        <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Исходные данные и файлы
        </h3>
        <div className="rounded-lg border border-[var(--card-border)]/90 bg-[var(--surface-muted)] p-2 sm:p-2.5">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Что есть
          </span>
          <div className="flex flex-nowrap items-center gap-x-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          </div>
        </div>
        <div className="mt-2 border-t border-[var(--card-border)] pt-2">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Файлы
          </h4>
          <OrderFilesPanel
            key={`${initial.id}-${invoiceAttachmentId ?? "no-inv"}`}
            orderId={initial.id}
            listenPaste
            onServerListChange={() => router.refresh()}
          />
        </div>
      </section>
    </div>
  );

  const oeColClientNotes = (
    <div className={editMainCol}>
      <div className="flex min-h-0 flex-1 flex-col">
        <h3 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Заказ от клиента
        </h3>
        <textarea
          id="oe-client-order"
          className={`${inputClass} mt-2 min-h-0 flex-1 resize-y`}
          rows={4}
          value={clientOrderText}
          onChange={(e) => setClientOrderText(e.target.value)}
          placeholder="Вставьте формулировку клиента…"
        />
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-[var(--card-border)] pt-3">
        <h3 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
          Комментарий
        </h3>
        <textarea
          id="oe-notes"
          className={`${inputClass} mt-2 min-h-0 flex-1 resize-y`}
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Внутренние пометки…"
        />
      </div>
    </div>
  );

  const oeMidCorrections = (
    <div
      className={`${editColWrap} flex min-h-0 flex-col xl:h-full`}
    >
      <OrderChatCorrectionsPanel
        orderId={initial.id}
        corrections={initial.chatCorrections}
        canAccept={canAcceptChatCorrections}
      />
    </div>
  );

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
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Состав заказа
        </h2>
        <p className="text-right text-xs text-[var(--text-secondary)] sm:text-sm">
          <span className="block sm:inline">
            Итого{" "}
            <strong className="tabular-nums text-[var(--text-strong)]">
              {moneyRu(financePreviewTotal)}
            </strong>
          </span>
          <span className="mt-0.5 block text-[10px] font-normal leading-tight text-[var(--text-muted)] sm:mt-0 sm:ml-2 sm:inline">
            с учётом срочности
          </span>
        </p>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        <OrderConstructionsEditor value={draftLines} onChange={setDraftLines} />
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
      <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-0 lg:divide-x lg:divide-[var(--card-border)]">
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
        className="flex flex-wrap gap-1.5 border-b border-[var(--card-border)] pb-2"
        role="tablist"
        aria-label="Документы и карточка"
      >
        {(
          [
            { key: "Документооборот" as const, label: "Документооборот" },
            { key: "Кайтен" as const, label: boardTabLabel },
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
                  ? "rounded-full bg-[var(--sidebar-blue)] px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"
                  : "rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)]"
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
          <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Счёт, ЭДО и документы
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <div className="min-w-0 space-y-3">
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
                  className={inputClass}
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
                  onDone={async (res) => {
                    setError(null);
                    setOk(true);
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
                    setOk(false);
                    setError(msg);
                  }}
                  className="w-full cursor-pointer rounded-md border border-dashed border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-center text-xs font-medium leading-snug text-[var(--text-secondary)] shadow-sm outline-none hover:border-[var(--sidebar-blue)] hover:text-[var(--text-strong)] focus-visible:ring-1 focus-visible:ring-sky-500 sm:text-sm"
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
            </div>
            <div className="min-w-0 border-t border-[var(--card-border)] pt-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-5">
                <div className="flex shrink-0 flex-col gap-2.5 sm:max-w-[15rem] sm:pt-0.5">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    ЭДО и бумаги
                  </h3>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-strong)]">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 shrink-0 rounded border-[var(--input-border)]"
                      checked={invoicePaperDocs}
                      onChange={(e) => setInvoicePaperDocs(e.target.checked)}
                    />
                    Бумажные документы
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-strong)]">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 shrink-0 rounded border-[var(--input-border)]"
                      checked={invoiceSentToEdo}
                      onChange={(e) => setInvoiceSentToEdo(e.target.checked)}
                    />
                    Отправлен в ЭДО
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-strong)]">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 shrink-0 rounded border-[var(--input-border)]"
                      checked={invoiceEdoSigned}
                      onChange={(e) => setInvoiceEdoSigned(e.target.checked)}
                    />
                    Подпись в ЭДО
                  </label>
                </div>
                <div className="min-w-0 flex-1 border-t border-[var(--card-border)] pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <label
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                    htmlFor="oe-invoice-payment-notes"
                  >
                    Комментарии к счёту и оплатам
                  </label>
                  <textarea
                    id="oe-invoice-payment-notes"
                    className={`${inputClass} min-h-[5rem] w-full resize-y sm:min-h-[6.5rem]`}
                    rows={3}
                    maxLength={8000}
                    value={invoicePaymentNotes}
                    onChange={(e) => setInvoicePaymentNotes(e.target.value)}
                    placeholder="Условия оплаты, напоминания, переписка с бухгалтерией…"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 border-t border-[var(--card-border)] pt-4 lg:grid-cols-2 lg:gap-6">
            <div className="min-w-0 space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Выставлено по счёту
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)] sm:items-start sm:gap-5">
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
                <div className="min-w-0 sm:max-w-[12rem]">
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
        </div>
      ) : activeTab === "Кайтен" ? (
        <div className={editColWrap}>
          {isDemoMode ? (
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
              kaitenCardUrl={initial.kaitenCardUrl}
              initialTrackLane={initial.kaitenTrackLane}
              initialKaitenBlocked={initial.kaitenBlocked}
              initialKaitenBlockReason={initial.kaitenBlockReason}
              kaitenDecideLater={initial.kaitenDecideLater === true}
              kaitenSyncError={initial.kaitenSyncError ?? null}
              kaitenCardTypeId={initial.kaitenCardTypeId ?? null}
              workSent={adminShippedOtpr}
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
      <div className="flex w-full max-w-full flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-end">
        <div className="flex flex-wrap items-start gap-2">
          {adminShippedOtpr ? (
            <div className="flex max-w-[15rem] items-start gap-2 rounded-md border border-emerald-200/80 bg-emerald-50/55 px-2 py-1.5 dark:border-emerald-800/45 dark:bg-emerald-950/35">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
                aria-hidden
              >
                <svg
                  className="h-4 w-4"
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
                <p className="text-[11px] font-semibold leading-snug text-[var(--text-strong)]">
                  Работа отправлена
                </p>
                <button
                  type="button"
                  className="mt-1 text-left text-[10px] font-medium text-[var(--sidebar-blue)] underline decoration-transparent hover:decoration-current"
                  onClick={() => setAdminShippedOtpr(false)}
                >
                  Снять отметку
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
              className="rounded-md border border-zinc-400/80 bg-zinc-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-600 dark:border-zinc-500 dark:bg-zinc-600 dark:hover:bg-zinc-500 sm:text-sm"
            >
              Работа отправлена
            </button>
          )}
        </div>
        {adminShippedOtpr && shippedDescription.trim() ? (
          <div className="min-w-0 max-w-full flex-1 rounded-md border border-teal-200/80 bg-teal-50/50 px-2.5 py-1.5 text-left dark:border-teal-900/40 dark:bg-teal-950/30 sm:max-w-[22rem]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Отгружено
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs leading-snug text-[var(--text-strong)]">
              {shippedDescription.trim()}
            </p>
            <button
              type="button"
              className="mt-1 text-left text-[10px] font-medium text-[var(--sidebar-blue)] underline decoration-transparent hover:decoration-current"
              onClick={() => openShipModalForEdit()}
            >
              Изменить текст
            </button>
          </div>
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

  const formInner = (
    <>
    <div className="w-full min-w-0 space-y-4">
      {initial.continuesFromOrder ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
          <span className="font-medium">Продолжение работы: </span>
          <Link
            href={`/orders/${initial.continuesFromOrder.id}`}
            className="font-semibold text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
          >
            наряд {initial.continuesFromOrder.orderNumber}
          </Link>
        </div>
      ) : null}
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
      <div className="flex flex-col gap-2 rounded-lg border border-[var(--card-border)] bg-gradient-to-b from-[var(--surface-subtle)] to-[var(--card-bg)] px-3 py-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-xs text-[var(--text-strong)] sm:text-sm">
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
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] sm:text-sm"
                title="Диалог печати браузера (как Ctrl+P)"
              >
                Печать наряда (PDF)
              </OrderNarjadPrintTrigger>
              {initial.kaitenCardUrl ? (
                <OrderKaitenQrModal
                  url={initial.kaitenCardUrl}
                  labelFull={isDemoMode ? "QR канбана" : "QR Kaiten"}
                  variant={isDemoMode ? "kanban" : "kaiten"}
                />
              ) : initial.kaitenCardId != null && !isDemoMode ? (
                <span
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 sm:text-sm"
                  title="Карточка есть (id в CRM), но не задана веб-ссылка. Укажите KAITEN_WEB_ORIGIN или KAITEN_CARD_URL_TEMPLATE в .env"
                >
                  Kaiten: настройте URL
                </span>
              ) : null}
            </div>
            <div className="flex w-full min-w-0 shrink-0 flex-col items-stretch sm:ml-auto sm:w-auto sm:items-end">
              {workSentNarjadActions}
            </div>
        </div>
        {!isOrderPageFramed ? (
          <div className="flex shrink-0 justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving || !doctorId.trim()}
              className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50 sm:text-sm"
            >
              {saving ? "Сохранение…" : "Сохранить наряд"}
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:text-emerald-100">
          Наряд сохранён.
        </div>
      ) : null}
      {saveSideNotice ? (
        <div className="rounded-md border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
          {saveSideNotice}
        </div>
      ) : null}

      {initial.kaitenBlocked ? (
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
              данные или посмотрите комментарий в самой Kaiten.
            </p>
          )}
        </div>
      ) : null}

      {isOrderPageFramed ? (
        <>
          {orderLayoutCustomize ? (
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
          <OrderEditPageLayoutGrid
            layout={orderLayoutPrefs}
            onLayoutChange={persistOrderLayout}
            customizeMode={orderLayoutCustomize}
            blocks={{
              topCustomer: oeColCustomer,
              topDeadlines: oeColDeadlines,
              topFiles: oeColFiles,
              topClientNotes: oeColClientNotes,
              midConstructions: oeMidConstructions,
              midCorrections: oeMidCorrections,
              midProsthetics: oeMidProsthetics,
              bottomSecondary: oeBottomSecondary,
            }}
          />
          <div className="flex justify-end pt-4">
            <OrderEditCustomizeToggle
              active={orderLayoutCustomize}
              onClick={() => setOrderLayoutCustomize((v) => !v)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4 xl:gap-3 xl:items-stretch">
            {oeColCustomer}
            {oeColDeadlines}
            {oeColFiles}
            {oeColClientNotes}
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12 xl:gap-3 xl:items-stretch">
            <div className="min-w-0 xl:col-span-6 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
              {oeMidConstructions}
            </div>
            <div className="min-w-0 xl:col-span-6 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
              {oeMidCorrections}
            </div>
            <div className="min-w-0 xl:col-span-6 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
              {oeMidProsthetics}
            </div>
          </div>
        </>
      )}
    </div>
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
    </>
  );

  const orderPageHeaderAccessory = orderPageFrame ? (
    <div className="relative z-50 flex min-w-0 max-w-full flex-wrap items-center gap-2 lg:gap-2.5">
      <KaitenHeaderPillMenu
        orderId={initial.id}
        kaitenCardId={initial.kaitenCardId}
        initialColumnTitle={initial.kaitenColumnTitle}
        isDemoMode={isDemoMode}
        demoKanbanColumn={initial.demoKanbanColumn}
        demoCardTypeName={initial.kaitenCardTypeName}
      />
      <UrgentPillMenu
        value={urgentSelection}
        onChange={setUrgentSelection}
      />
      <OrderHeadlinePills
        prostheticsOrdered={prostheticsOrdered}
        hasInvoiceAttachment={Boolean(invoiceAttachmentId)}
        invoicePrinted={invoicePrinted}
        adminShippedOtpr={adminShippedOtpr}
      />
    </div>
  ) : null;

  if (orderPageFrame) {
    return (
      <>
        <ModuleFrame
          title={orderPageFrame.title}
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
              className="border-0 bg-transparent p-0 text-left text-[0.65rem] font-normal text-[var(--text-muted)] underline decoration-transparent underline-offset-2 hover:decoration-current"
            >
              Изменить номер
            </button>
          }
          description={orderPageFrame.description ?? undefined}
          titleAccessory={orderPageHeaderAccessory}
          titleRowEnd={
            <button
              type="button"
              onClick={save}
              disabled={saving || !doctorId.trim()}
              className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50 sm:text-sm"
            >
              {saving ? "Сохранение…" : "Сохранить наряд"}
            </button>
          }
        >
          {formInner}
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
                Kaiten будет удалена (если настроен API). Номер наряда не перейдёт к
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
