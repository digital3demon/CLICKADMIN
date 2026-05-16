"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LabStatusPillMenu,
  useMenuDismiss,
} from "@/components/orders/LabStatusPillMenu";
import { useFixedDropdownPosition } from "@/components/ui/use-fixed-dropdown-position";
import { createPortal } from "react-dom";
import { OrderCorrectionDetails } from "@/components/orders/OrderCorrectionDetails";
import {
  LAB_WORK_STATUS_DEFAULT,
  normalizeLegacyLabWorkStatus,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import {
  ORDER_DRAFT_SNAPSHOT_VERSION,
  type OrderDraftSnapshot,
} from "@/lib/order-draft-snapshot";
import {
  ORDER_CORRECTION_TRACK_LABELS,
  ORDER_CORRECTION_TRACK_VALUES,
  type OrderCorrectionTrackValue,
} from "@/lib/order-correction-track";
import {
  clinicComboboxSearchPrefixes,
  clinicSelectLabel,
  orderDoctorsForClinicCombobox,
  ORDER_CLINIC_PRIVATE,
} from "@/lib/clients-order-ui";
import {
  canonicalOrderPayment,
  isReconciliationPaymentStatus,
  legalEntitySelectFromClinicBilling,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PAID,
  ORDER_PAYMENT_PARTIAL,
  ORDER_PAYMENT_RECON_PAID,
  ORDER_PAYMENT_RECON_UNPAID,
  sverkaPaymentSelectLabel,
  withExtraSelectOption,
} from "@/lib/order-clinic-client-fields";
import {
  URGENT_MENU_OPTIONS,
  URGENT_NO_COEF,
  URGENT_UNSET,
} from "@/lib/order-urgency";
import {
  useNewOrderPanel,
  type OrderSourceEmail,
} from "@/components/orders/new-order-panel-context";
import { OrderFilesPanel } from "@/components/orders/OrderFilesPanel";
import type { BridgeLineInput } from "@/lib/detail-lines-to-constructions";
import { detailLinesAndBridgesToConstructionsJson } from "@/lib/detail-lines-to-constructions";
import { constructionsFromQuickOrder } from "@/lib/quick-order-constructions";
import {
  loadQuickOrderTemplate,
  loadQuickOrderTemplateFromDb,
  quickOrderTemplateAsNewOrderDefaults,
  saveQuickOrderTemplate,
} from "@/lib/quick-order-template-storage";
import { printOrderNarjadPdf } from "@/lib/print-order-narjad";
import { cleanMailTextBody } from "@/lib/mail/mail-text-cleanup";
import { OrderProstheticsBlock } from "@/components/orders/OrderProstheticsBlock";
import { PodrobnoSection } from "./PodrobnoSection";
import { type DetailLine, newDetailLineId } from "./detail-lines";
import { detailPriceListLabelLooksLikeCorrectionKp } from "@/lib/pricing/correction-price-item";
import { fetchCorrectionPriceListMeta } from "@/lib/pricing/fetch-correction-price-list-meta";
import {
  KaitenPreflightModal,
  type KaitenSavePayload,
} from "./KaitenPreflightModal";
import {
  NewOrderDuplicatePreflightModal,
  type ContinuationParent,
  type DuplicateGateState,
} from "./NewOrderDuplicatePreflightModal";
import { QuickOrderSection } from "./QuickOrderSection";
import {
  mergeQuickOrderFromSnapshot,
  type QuickOrderState,
} from "./quick-order-types";
import { PrefixSearchCombobox } from "@/components/ui/PrefixSearchCombobox";
import {
  emptyProsthetics,
  type OrderProstheticsV1,
} from "@/lib/order-prosthetics";
import {
  localDateTimeToIso,
} from "@/lib/datetime-local";
import { DueDatetimeComboPicker } from "@/components/ui/DueDatetimeComboPicker";
import {
  DEFAULT_LAB_DUE_HM_SLOTS,
  normalizeLabDueHmSlots,
} from "@/lib/lab-due-hm-slots";
import {
  autoLabDueLocalFromLeadWorkingDays,
  clampLabDueLocalToMin,
  DUE_DAY_DEFAULT_HM,
  earliestDueGridLocalFromCreatedAt,
  earliestLabDueGridLocalFromCreatedAt,
  parseHmFromDueGridLocal,
  snapDatetimeLocalToDueGrid,
  snapDatetimeLocalToLabDueGrid,
} from "@/lib/order-due-datetime";
import { normalizeProductionCalendarCountry } from "@/lib/production-calendar";
import { writeClientState } from "@/lib/client-state-client";
import {
  normalizeOrderAttachmentUploadQueue,
} from "@/lib/order-attachment-upload-client";
import {
  CRM_UPLOAD_MAX_BYTES,
  CRM_UPLOAD_TOO_LARGE_MESSAGE,
} from "@/lib/crm-upload-limits";
import { enqueueOrderAttachmentFiles } from "@/lib/order-attachment-background-queue";
import { useAutosizeTextarea } from "@/lib/use-autosize-textarea";
import { orderPathById } from "@/lib/order-public-ref";

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
  billingLegalForm?: "IP" | "OOO" | null;
  worksWithReconciliation?: boolean;
  reconciliationFrequency?: "MONTHLY_1" | "MONTHLY_2" | null;
  sourceDoctorId?: string | null;
  doctors: DoctorRow[];
};

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

const PLACEHOLDER_DOCTOR_ID = "sys-placeholder-doctor-reimport";
const CLIENT_ORDER_TEXTAREA_MAX_HEIGHT = 240;
const COMMENTS_TEXTAREA_MAX_HEIGHT = 160;

function detailLineLooksLikeCorrectionKp(l: DetailLine): boolean {
  if (l.kind !== "priceList") return false;
  return detailPriceListLabelLooksLikeCorrectionKp(l.label);
}

export function NewOrderForm({
  panelId,
  titleId,
  initialSnapshot,
  sourceEmails = [],
  onCollapse,
  onClose,
  onAfterSuccessfulSave,
  onKaitenCancelCollapse,
}: {
  panelId: string;
  titleId: string;
  initialSnapshot?: OrderDraftSnapshot | null;
  sourceEmails?: OrderSourceEmail[];
  onCollapse: () => void;
  onClose: () => void;
  onAfterSuccessfulSave: () => void;
  onKaitenCancelCollapse: () => void;
}) {
  const router = useRouter();
  const { registerPanelSnapshot, sessionRole } = useNewOrderPanel();
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [privatePracticeDoctors, setPrivatePracticeDoctors] = useState<
    DoctorRow[]
  >([]);
  /** Все врачи — для выбора по клинике (связь создаётся при сохранении наряда). */
  const [allDoctors, setAllDoctors] = useState<DoctorRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newDoctorFio, setNewDoctorFio] = useState("");
  const [addClientError, setAddClientError] = useState<string | null>(null);
  const [addClientSaving, setAddClientSaving] = useState(false);

  const [clinicId, setClinicId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [legalEntity, setLegalEntity] = useState<string>(LEGAL_ENTITIES[0]);
  const [payment, setPayment] = useState<string>(ORDER_PAYMENT_NOT_PAID);
  const [paymentPartialRubText, setPaymentPartialRubText] = useState("");
  const [patientName, setPatientName] = useState("");
  const [clientOrderText, setClientOrderText] = useState("");
  const [comments, setComments] = useState("");
  const clientOrderTextareaRef = useAutosizeTextarea(clientOrderText, {
    maxHeight: CLIENT_ORDER_TEXTAREA_MAX_HEIGHT,
  });
  const [hasScans, setHasScans] = useState(false);
  const [hasCt, setHasCt] = useState(false);
  const [hasMri, setHasMri] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [additionalSourceNotes, setAdditionalSourceNotes] = useState("");
  const [urgentSelection, setUrgentSelection] = useState<string>(URGENT_UNSET);
  const [labWorkStatus, setLabWorkStatus] =
    useState<LabWorkStatus>(LAB_WORK_STATUS_DEFAULT);
  const [workDueLocal, setWorkDueLocal] = useState("");
  const [patientAppointmentLocal, setPatientAppointmentLocal] = useState("");
  const [workReceivedLocal, setWorkReceivedLocal] = useState("");
  const [labWholeDay, setLabWholeDay] = useState(true);
  const [appointmentWholeDay, setAppointmentWholeDay] = useState(true);
  const [formOpenedAtIso] = useState(() => new Date().toISOString());
  const [labDueHmSlots, setLabDueHmSlots] = useState<string[]>(() => [
    ...DEFAULT_LAB_DUE_HM_SLOTS,
  ]);
  const [productionCalendarCountry, setProductionCalendarCountry] =
    useState("RU");
  const [labDueAutoByPrice, setLabDueAutoByPrice] = useState(true);
  const [quickOrder, setQuickOrder] = useState<QuickOrderState>(() => {
    if (initialSnapshot != null) {
      return mergeQuickOrderFromSnapshot(initialSnapshot.quickOrder);
    }
    const tpl = loadQuickOrderTemplate();
    if (tpl) {
      return quickOrderTemplateAsNewOrderDefaults(tpl);
    }
    return mergeQuickOrderFromSnapshot();
  });
  const quickOrderTemplateHydratedRef = useRef(false);
  const [detailLines, setDetailLines] = useState<DetailLine[]>([]);
  const [bridgeLines, setBridgeLines] = useState<BridgeLineInput[]>([]);
  const [prosthetics, setProsthetics] = useState<OrderProstheticsV1>(() =>
    emptyProsthetics(),
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isTestOrder, setIsTestOrder] = useState(false);
  /** Только max-md: сворачивание пилюль срочности и блоков дат в шапке. */
  const [mobileHeaderDetailsOpen, setMobileHeaderDetailsOpen] = useState(true);
  const [kaitenModalOpen, setKaitenModalOpen] = useState(false);
  const [duplicateGate, setDuplicateGate] = useState<DuplicateGateState | null>(
    null,
  );
  const [continuationChoice, setContinuationChoice] =
    useState<ContinuationParent | null>(null);
  const [nextOrderPreview, setNextOrderPreview] = useState<string | null>(null);
  const [correctionTrack, setCorrectionTrack] =
    useState<OrderCorrectionTrackValue | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionPaid, setCorrectionPaid] = useState(false);
  const hydratedRef = useRef(false);
  const prevClinicIdForLegalRef = useRef<string | null>(null);
  const canUseTestOrder = sessionRole === "OWNER";

  useEffect(() => {
    if (canUseTestOrder) return;
    setIsTestOrder(false);
  }, [canUseTestOrder]);

  const selectedClinic = useMemo(
    () =>
      clinicId && clinicId !== ORDER_CLINIC_PRIVATE
        ? clinics.find((c) => c.id === clinicId)
        : undefined,
    [clinicId, clinics],
  );

  const selectedDoctorForIp = useMemo(
    () => (doctorId ? allDoctors.find((d) => d.id === doctorId) : undefined),
    [doctorId, allDoctors],
  );

  /** Клиника для «СВЕРКА» / прайса: при частной практике + «ИП» — клиника-зеркало врача. */
  const effectiveFinanceClinic = useMemo(() => {
    if (clinicId && clinicId !== ORDER_CLINIC_PRIVATE) {
      return selectedClinic;
    }
    if (
      (clinicId === "" || clinicId === ORDER_CLINIC_PRIVATE) &&
      legalEntity === "ИП" &&
      selectedDoctorForIp?.ipClinicId
    ) {
      return clinics.find((c) => c.id === selectedDoctorForIp.ipClinicId);
    }
    return undefined;
  }, [
    clinicId,
    legalEntity,
    selectedClinic,
    selectedDoctorForIp,
    clinics,
  ]);

  const effectiveClinicIdForPrice = effectiveFinanceClinic?.id ?? null;

  const maxLeadWorkingDaysFromPriceLines = useMemo(() => {
    let maxLead: number | null = null;
    for (const line of detailLines) {
      if (line.kind !== "priceList") continue;
      const lead = line.leadWorkingDays;
      if (typeof lead !== "number" || !Number.isFinite(lead)) continue;
      const norm = Math.max(0, Math.trunc(lead));
      maxLead = maxLead == null ? norm : Math.max(maxLead, norm);
    }
    return maxLead;
  }, [detailLines]);

  const dueDateMinLocal = useMemo(
    () => earliestDueGridLocalFromCreatedAt(formOpenedAtIso),
    [formOpenedAtIso],
  );

  const dueLabMinLocal = useMemo(
    () =>
      earliestLabDueGridLocalFromCreatedAt(formOpenedAtIso, labDueHmSlots),
    [formOpenedAtIso, labDueHmSlots],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/tenant/lab-due-hm-slots", {
          credentials: "include",
          cache: "no-store",
        });
        const j = (await res.json()) as { slots?: unknown; country?: unknown };
        if (!res.ok || cancelled) return;
        setLabDueHmSlots(normalizeLabDueHmSlots(j.slots ?? null));
        setProductionCalendarCountry(
          normalizeProductionCalendarCountry(
            typeof j.country === "string" ? j.country : null,
          ),
        );
      } catch {
        /* дефолт из состояния */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setWorkDueLocal((prev) => {
      if (!prev.trim()) return prev;
      const minLab = earliestLabDueGridLocalFromCreatedAt(
        formOpenedAtIso,
        labDueHmSlots,
      );
      const raw = snapDatetimeLocalToLabDueGrid(prev, labDueHmSlots);
      return clampLabDueLocalToMin(raw, minLab, labDueHmSlots);
    });
  }, [labDueHmSlots, formOpenedAtIso]);

  useEffect(() => {
    if (!labDueAutoByPrice) return;
    if (maxLeadWorkingDaysFromPriceLines == null) return;
    const baseLocal = workReceivedLocal.trim() || dueLabMinLocal;
    const autoLocal = autoLabDueLocalFromLeadWorkingDays({
      baseLocal,
      leadWorkingDays: maxLeadWorkingDaysFromPriceLines,
      slotsHm: labDueHmSlots,
      country: productionCalendarCountry,
    });
    if (!autoLocal.trim()) return;
    const next = clampLabDueLocalToMin(autoLocal, dueLabMinLocal, labDueHmSlots);
    setWorkDueLocal((prev) => (prev === next ? prev : next));
    if (next.trim()) {
      const hm = parseHmFromDueGridLocal(next);
      setLabWholeDay(!(hm != null && hm !== DUE_DAY_DEFAULT_HM));
    }
  }, [
    dueLabMinLocal,
    labDueAutoByPrice,
    labDueHmSlots,
    maxLeadWorkingDaysFromPriceLines,
    productionCalendarCountry,
    workReceivedLocal,
  ]);

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

  /** Юр. лицо из карточки клиники; для частной практики — только вручную. */
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
        setPayment(ORDER_PAYMENT_RECON_UNPAID);
      } else {
        setPayment(ORDER_PAYMENT_NOT_PAID);
      }
    }
  }, [clinicId, clinics]);

  /** «Сверка» в оплате только если в карточке клиники (или ИП) включена сверка. */
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

  /** Частная практика + «ИП» + сверка в клинике-ИП: как при выборе клиники. */
  useEffect(() => {
    if (clinicId !== "" && clinicId !== ORDER_CLINIC_PRIVATE) return;
    if (legalEntity !== "ИП") return;
    const c = effectiveFinanceClinic;
    if (c?.worksWithReconciliation === true) {
      setPayment(ORDER_PAYMENT_RECON_UNPAID);
    }
  }, [clinicId, legalEntity, effectiveFinanceClinic]);

  useEffect(() => {
    if (payment === ORDER_PAYMENT_PARTIAL) return;
    if (paymentPartialRubText === "") return;
    setPaymentPartialRubText("");
  }, [payment, paymentPartialRubText]);

  const refreshOrderNumberPreview = useCallback(async () => {
    try {
      const res = await fetch("/api/order-number-settings", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = (await res.json()) as { nextOrderNumber?: string };
      if (j.nextOrderNumber) setNextOrderPreview(j.nextOrderNumber);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshOrderNumberPreview();
    const onFocus = () => void refreshOrderNumberPreview();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshOrderNumberPreview]);

  useEffect(() => {
    if (!initialSnapshot || hydratedRef.current) return;
    hydratedRef.current = true;
    const s = initialSnapshot;
    setClinicId(s.clinicId);
    setDoctorId(s.doctorId);
    setLegalEntity(s.legalEntity);
    setPayment(canonicalOrderPayment(s.payment));
    setPaymentPartialRubText(
      typeof s.paymentPartialRub === "number" ? String(s.paymentPartialRub) : "",
    );
    setPatientName(s.patientName);
    setClientOrderText(
      typeof s.clientOrderText === "string" ? s.clientOrderText : "",
    );
    setComments(s.comments);
    setHasScans(s.hasScans);
    setHasCt(s.hasCt);
    setHasMri(s.hasMri);
    setHasPhoto(s.hasPhoto);
    setAdditionalSourceNotes(
      typeof s.additionalSourceNotes === "string" ? s.additionalSourceNotes : "",
    );
    setUrgentSelection(s.urgentSelection);
    setLabWorkStatus(
      normalizeLegacyLabWorkStatus(
        String(
          "labWorkStatus" in s && s.labWorkStatus != null
            ? s.labWorkStatus
            : LAB_WORK_STATUS_DEFAULT,
        ),
      ) as LabWorkStatus,
    );
    const wd = snapDatetimeLocalToLabDueGrid(s.workDueLocal ?? "");
    setWorkDueLocal(wd);
    setLabDueAutoByPrice(!wd.trim());
    const pa =
      "patientAppointmentLocal" in s && typeof s.patientAppointmentLocal === "string"
        ? snapDatetimeLocalToDueGrid(s.patientAppointmentLocal)
        : "";
    setPatientAppointmentLocal(pa);
    const snap16 = s as OrderDraftSnapshot;
    if (typeof snap16.labWholeDay === "boolean") {
      setLabWholeDay(snap16.labWholeDay);
    } else if (!wd.trim()) {
      setLabWholeDay(true);
    } else {
      const hm = parseHmFromDueGridLocal(wd);
      setLabWholeDay(!(hm != null && hm !== DUE_DAY_DEFAULT_HM));
    }
    if (typeof snap16.appointmentWholeDay === "boolean") {
      setAppointmentWholeDay(snap16.appointmentWholeDay);
    } else if (!pa.trim()) {
      setAppointmentWholeDay(true);
    } else {
      const hm = parseHmFromDueGridLocal(pa);
      setAppointmentWholeDay(!(hm != null && hm !== DUE_DAY_DEFAULT_HM));
    }
    setWorkReceivedLocal(
      "workReceivedLocal" in s && typeof s.workReceivedLocal === "string"
        ? snapDatetimeLocalToDueGrid(s.workReceivedLocal)
        : "",
    );
    setQuickOrder(mergeQuickOrderFromSnapshot(s.quickOrder));
    setDetailLines(JSON.parse(JSON.stringify(s.detailLines)));
    setBridgeLines(JSON.parse(JSON.stringify(s.bridgeLines ?? [])));
    if (s.prosthetics) {
      setProsthetics(JSON.parse(JSON.stringify(s.prosthetics)));
    } else {
      setProsthetics(emptyProsthetics());
    }
    const ct = (s as OrderDraftSnapshot).correctionTrack;
    if (ct && ORDER_CORRECTION_TRACK_VALUES.includes(ct)) {
      setCorrectionTrack(ct);
    } else {
      setCorrectionTrack(null);
    }
    setCorrectionReason(
      typeof (s as OrderDraftSnapshot).correctionReason === "string"
        ? (s as OrderDraftSnapshot).correctionReason ?? ""
        : "",
    );
    setCorrectionPaid(
      (s as OrderDraftSnapshot).correctionPaid === true && ct != null,
    );
  }, [initialSnapshot]);

  useEffect(() => {
    if (correctionTrack == null) {
      setCorrectionReason("");
      setCorrectionPaid(false);
    }
  }, [correctionTrack]);

  useEffect(() => {
    if (correctionTrack == null || !correctionPaid) {
      setDetailLines((prev) =>
        prev.filter((l) => !detailLineLooksLikeCorrectionKp(l)),
      );
      return;
    }
    let cancelled = false;
    void (async () => {
      const meta = await fetchCorrectionPriceListMeta({
        clinicId:
          clinicId && clinicId !== ORDER_CLINIC_PRIVATE ? clinicId : null,
        doctorId: doctorId.trim() ? doctorId : null,
      });
      if (cancelled || !meta) return;
      setDetailLines((prev) => {
        if (
          prev.some(
            (l) =>
              l.kind === "priceList" && l.priceListItemId === meta.id,
          )
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            id: newDetailLineId(),
            kind: "priceList",
            priceListItemId: meta.id,
            label: `${meta.code} · ${meta.name}`,
            quantity: 1,
            unitPrice: meta.priceRub,
          },
        ];
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [correctionTrack, correctionPaid, clinicId, doctorId]);

  const orderDraftSnapshot = useMemo<OrderDraftSnapshot>(
    () => ({
      version: ORDER_DRAFT_SNAPSHOT_VERSION,
      activeTab: "Заказ",
      clinicId,
      doctorId,
      legalEntity,
      payment,
      paymentPartialRub:
        payment === ORDER_PAYMENT_PARTIAL
          ? Number(paymentPartialRubText.trim()) || 0
          : undefined,
      excludeFromReconciliation: false,
      patientName,
      clientOrderText,
      comments,
      hasScans,
      hasCt,
      hasMri,
      hasPhoto,
      additionalSourceNotes,
      urgentSelection,
      labWorkStatus,
      workDueLocal,
      patientAppointmentLocal,
      labWholeDay,
      appointmentWholeDay,
      workReceivedLocal,
      quickOrder: JSON.parse(JSON.stringify(quickOrder)),
      detailLines: JSON.parse(JSON.stringify(detailLines)),
      bridgeLines: JSON.parse(JSON.stringify(bridgeLines)),
      prosthetics: JSON.parse(JSON.stringify(prosthetics)),
      correctionTrack,
      correctionReason,
      correctionPaid,
    }),
    [
      clinicId,
      doctorId,
      legalEntity,
      payment,
      paymentPartialRubText,
      patientName,
      clientOrderText,
      comments,
      hasScans,
      hasCt,
      hasMri,
      hasPhoto,
      additionalSourceNotes,
      urgentSelection,
      labWorkStatus,
      workDueLocal,
      patientAppointmentLocal,
      labWholeDay,
      appointmentWholeDay,
      workReceivedLocal,
      quickOrder,
      detailLines,
      bridgeLines,
      prosthetics,
      correctionTrack,
      correctionReason,
      correctionPaid,
    ],
  );

  useEffect(() => {
    return registerPanelSnapshot(panelId, () => orderDraftSnapshot);
  }, [panelId, registerPanelSnapshot, orderDraftSnapshot]);

  /** Шаблон плашек для следующих окон «Новый наряд» (серверное user-state). */
  useEffect(() => {
    if (initialSnapshot != null) return;
    if (quickOrderTemplateHydratedRef.current) return;
    quickOrderTemplateHydratedRef.current = true;
    void (async () => {
      const tpl = await loadQuickOrderTemplateFromDb();
      if (!tpl) return;
      setQuickOrder(quickOrderTemplateAsNewOrderDefaults(tpl));
    })();
  }, [initialSnapshot]);

  useEffect(() => {
    if (quickOrder.tiles.length === 0) return;
    const t = window.setTimeout(() => {
      saveQuickOrderTemplate(quickOrder);
    }, 500);
    return () => clearTimeout(t);
  }, [quickOrder]);

  const loadClinics = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/clinics");
      if (!res.ok) throw new Error("Ошибка загрузки");
      const data = (await res.json()) as {
        clinics: ClinicRow[];
        privatePracticeDoctors?: DoctorRow[];
        allDoctors?: DoctorRow[];
      };
      setClinics(data.clinics ?? []);
      setPrivatePracticeDoctors(data.privatePracticeDoctors ?? []);
      setAllDoctors(data.allDoctors ?? []);
    } catch {
      setLoadError("Не удалось загрузить клиники и врачей");
    }
  }, []);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

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

  const doctorsForClinicVisible = useMemo(
    () =>
      doctorsForClinic.filter((d) => {
        if (d.id === PLACEHOLDER_DOCTOR_ID) return false;
        if (
          d.fullName.trim() === "— Врач не задан (заказы после сброса справочника)"
        ) {
          return false;
        }
        return true;
      }),
    [doctorsForClinic],
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
      {
        value: ORDER_CLINIC_PRIVATE,
        label: "Частная практика (врач)",
      },
    ],
    [prioritizedClinics],
  );

  const doctorComboboxOptions = useMemo(
    () =>
      doctorsForClinicVisible.map((d) => ({ value: d.id, label: d.fullName })),
    [doctorsForClinicVisible],
  );

  useEffect(() => {
    if (doctorId !== PLACEHOLDER_DOCTOR_ID) return;
    setDoctorId("");
  }, [doctorId]);

  const onClinicChange = useCallback(
    (id: string) => {
      setClinicId(id);
      const row =
        id && id !== ORDER_CLINIC_PRIVATE
          ? clinics.find((c) => c.id === id)
          : undefined;
      if (row?.sourceDoctorId) {
        setDoctorId(row.sourceDoctorId);
        return;
      }
      setDoctorId((prev) => {
        if (!prev) return "";
        const allowed = orderDoctorsForClinicCombobox(
          id,
          privatePracticeDoctors,
          clinics,
          allDoctors,
        );
        return allowed.some((d) => d.id === prev) ? prev : "";
      });
    },
    [clinics, privatePracticeDoctors, allDoctors],
  );

  const submitNewClient = useCallback(async () => {
    setAddClientError(null);
    const doctorFio = newDoctorFio.trim();
    if (!doctorFio) {
      setAddClientError("Укажите ФИО врача");
      return;
    }
    setAddClientSaving(true);
    try {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName.trim() || null,
          address: newClientAddress.trim() || null,
          doctorFullName: doctorFio,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        clinic?: { id: string } | null;
        doctor?: { id: string };
      };
      if (!res.ok) {
        setAddClientError(
          typeof data.error === "string" ? data.error : "Не удалось создать",
        );
        return;
      }
      await loadClinics();
      if (data.clinic?.id) {
        setClinicId(data.clinic.id);
      } else {
        setClinicId(ORDER_CLINIC_PRIVATE);
      }
      if (data.doctor?.id) {
        setDoctorId(data.doctor.id);
      }
      setAddClientOpen(false);
      setNewClientName("");
      setNewClientAddress("");
      setNewDoctorFio("");
    } catch {
      setAddClientError("Сеть или сервер недоступны");
    } finally {
      setAddClientSaving(false);
    }
  }, [newClientName, newClientAddress, newDoctorFio, loadClinics]);

  useEffect(() => {
    if (!addClientOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !addClientSaving) setAddClientOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [addClientOpen, addClientSaving]);

  const requestSave = useCallback(async () => {
    setSaveError(null);
    if (!isTestOrder && !doctorId) {
      setSaveError("Выберите врача");
      return;
    }
    if (!isTestOrder && !patientName.trim()) {
      setSaveError("Укажите ФИО пациента");
      return;
    }
    if (!isTestOrder && !patientAppointmentLocal.trim()) {
      setSaveError("Укажите дату записи (Запись)");
      return;
    }
    if (isTestOrder) {
      // Для тестового наряда тоже показываем preflight:
      // пользователь выбирает сценарий создания карточки в CRM-канбане.
      setContinuationChoice(null);
      setKaitenModalOpen(true);
      return;
    }

    const clinicParam =
      clinicId === ORDER_CLINIC_PRIVATE ? "" : clinicId.trim();
    const qs = new URLSearchParams({
      doctorId,
      patientName: patientName.trim(),
      clinicId: clinicParam,
    });
    if (clinicParam === "" && legalEntity && legalEntity !== LEGAL_ENTITIES[0]) {
      qs.set("legalEntity", legalEntity);
    }

    try {
      const res = await fetch(
        `/api/orders/duplicate-preflight?${qs.toString()}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        kind?: string;
        matches?: { id: string; orderNumber: string; createdAt: string }[];
        suggestedParent?: {
          id: string;
          orderNumber: string;
          createdAt: string;
        };
        error?: string;
      };
      if (!res.ok) {
        setSaveError(data.error ?? "Ошибка проверки дубликатов");
        return;
      }
      if (data.kind === "open_duplicate" && data.matches?.length) {
        setDuplicateGate({ type: "open", matches: data.matches });
        return;
      }
      if (data.kind === "shipped_only" && data.suggestedParent) {
        setDuplicateGate({ type: "shipped", parent: data.suggestedParent });
        return;
      }
      setContinuationChoice(null);
      setKaitenModalOpen(true);
    } catch {
      setContinuationChoice(null);
      setKaitenModalOpen(true);
    }
  }, [
    clinicId,
    doctorId,
    isTestOrder,
    patientName,
    patientAppointmentLocal,
    legalEntity,
  ]);

  const performSave = useCallback(
    async (kaiten: KaitenSavePayload, printAfterSave = false) => {
      const appointmentIso = isTestOrder
        ? null
        : localDateTimeToIso(snapDatetimeLocalToDueGrid(patientAppointmentLocal));
      if (!isTestOrder && !appointmentIso) {
        setSaveError("Укажите корректную дату записи (Запись)");
        return;
      }
      let parsedPaymentPartialRub: number | null = null;
      if (payment === ORDER_PAYMENT_PARTIAL) {
        const n = Number(paymentPartialRubText.trim());
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
          setSaveError("Для частичной оплаты укажите сумму (целые рубли)");
          return;
        }
        parsedPaymentPartialRub = n;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinicId:
              clinicId === ORDER_CLINIC_PRIVATE
                ? null
                : clinicId.trim() || null,
            doctorId: doctorId.trim() || null,
            isTestOrder,
            patientName: patientName.trim() || null,
            legalEntity:
              legalEntity === LEGAL_ENTITIES[0] ? null : legalEntity,
            payment: payment.trim() || null,
            paymentPartialRub: parsedPaymentPartialRub,
            excludeFromReconciliation: false,
            clientOrderText: clientOrderText.trim() || null,
            comments: comments.trim() || null,
            hasScans,
            hasCt,
            hasMri,
            hasPhoto,
            additionalSourceNotes: additionalSourceNotes.trim() || null,
            isUrgent: urgentSelection !== URGENT_UNSET,
            urgentCoefficient:
              urgentSelection === URGENT_UNSET ||
              urgentSelection === URGENT_NO_COEF
                ? null
                : Number(urgentSelection),
            labWorkStatus,
            dueDate: workDueLocal.trim()
              ? localDateTimeToIso(
                  snapDatetimeLocalToLabDueGrid(workDueLocal, labDueHmSlots),
                )
              : null,
            dueToAdminsAt: appointmentIso,
            kaitenAdminDueHasTime: !labWholeDay,
            dueToAdminsHasTime: !appointmentWholeDay,
            waitForKaitenBeforePrint: printAfterSave,
            workReceivedAt: workReceivedLocal.trim()
              ? localDateTimeToIso(
                  snapDatetimeLocalToDueGrid(workReceivedLocal),
                )
              : null,
            quickOrder,
            constructions: [
              ...detailLinesAndBridgesToConstructionsJson(
                detailLines,
                bridgeLines,
              ),
              ...constructionsFromQuickOrder(quickOrder),
            ],
            prosthetics,
            correctionTrack: correctionTrack ?? null,
            correctionReason:
              correctionTrack != null ? correctionReason.trim() || null : null,
            correctionPaid:
              correctionTrack != null ? correctionPaid : false,
            ...(continuationChoice
              ? { continuesFromOrderId: continuationChoice.id }
              : {}),
            ...(kaiten.kaitenDecideLater
              ? kaiten.createKanbanWithoutKaiten === true
                ? {
                    kaitenDecideLater: true,
                    createKanbanWithoutKaiten: true,
                    kaitenCardTypeId: kaiten.kaitenCardTypeId,
                    kaitenTrackLane: kaiten.kaitenTrackLane,
                    kaitenCardTitleLabel: kaiten.kaitenCardTitleLabel,
                  }
                : { kaitenDecideLater: true }
              : {
                  kaitenDecideLater: false,
                  kaitenCardTypeId: kaiten.kaitenCardTypeId,
                  kaitenTrackLane: kaiten.kaitenTrackLane,
                  kaitenCardTitleLabel: kaiten.kaitenCardTitleLabel,
                }),
          }),
        });
        const data = (await res.json()) as {
          id?: string;
          orderNumber?: string;
          kaitenPrintSyncError?: string | null;
          error?: string;
        };
        if (!res.ok) {
          setSaveError(data.error ?? "Ошибка сохранения");
          return;
        }
        const newId = data.id;
        if (!newId) {
          setSaveError("Наряд сохранён, но не получен id заказа");
          return;
        }
        if (printAfterSave && data.kaitenPrintSyncError) {
          setSaveError(
            `Наряд сохранён, но карточка Kaiten не создана для печати QR: ${data.kaitenPrintSyncError}`,
          );
          return;
        }
        if (pendingFiles.length > 0) {
          const filesToUpload = [...pendingFiles];
          const normalized = normalizeOrderAttachmentUploadQueue(
            filesToUpload,
            CRM_UPLOAD_MAX_BYTES,
          );
          const uploadQueue = normalized.queue;
          // Большие пачки файлов грузим в фоне: сохранение/печать не должны "висеть".
          void (async () => {
            if (normalized.skippedTooLarge) {
              void writeClientState(
                "user",
                `orderAttachmentsWarn:${newId}`,
                CRM_UPLOAD_TOO_LARGE_MESSAGE,
              );
            }
            if (uploadQueue.length === 0) return;

            try {
              await enqueueOrderAttachmentFiles({
                orderId: newId,
                orderNumber: data.orderNumber ?? null,
                files: uploadQueue,
              });
              setPendingFiles([]);
            } catch (e) {
              const msg =
                e instanceof Error && e.message.trim()
                  ? e.message.trim()
                  : "Не удалось поставить файлы в очередь загрузки";
              void writeClientState("user", `orderAttachmentsWarn:${newId}`, msg);
            }
          })();
        }
        if (printAfterSave) {
          void printOrderNarjadPdf(newId).catch(() => {
            /* наряд уже сохранён */
          });
        }
        if (quickOrder.tiles.length > 0) {
          saveQuickOrderTemplate(quickOrder);
        }
        setKaitenModalOpen(false);
        setContinuationChoice(null);
        router.push("/orders");
        onAfterSuccessfulSave();
      } catch {
        setSaveError("Сеть недоступна или сервер не отвечает");
      } finally {
        setSaving(false);
      }
    },
    [
      clinicId,
      doctorId,
      isTestOrder,
      patientName,
      legalEntity,
      payment,
      paymentPartialRubText,
      selectedClinic?.worksWithReconciliation,
      clientOrderText,
      comments,
      hasScans,
      hasCt,
      hasMri,
      hasPhoto,
      additionalSourceNotes,
      urgentSelection,
      labWorkStatus,
      workDueLocal,
      labDueHmSlots,
      patientAppointmentLocal,
      labWholeDay,
      appointmentWholeDay,
      workReceivedLocal,
      quickOrder,
      detailLines,
      bridgeLines,
      prosthetics,
      correctionTrack,
      correctionReason,
      correctionPaid,
      continuationChoice,
      pendingFiles,
      router,
      onAfterSuccessfulSave,
    ],
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden">
      <NewOrderDuplicatePreflightModal
        open={duplicateGate != null}
        gate={duplicateGate}
        onClose={() => setDuplicateGate(null)}
        onProceedCreateAnyway={() => {
          setDuplicateGate(null);
          setContinuationChoice(null);
          setKaitenModalOpen(true);
        }}
        onProceedAsContinuation={(parent) => {
          setDuplicateGate(null);
          setContinuationChoice(parent);
          setKaitenModalOpen(true);
        }}
        onProceedWithoutContinuation={() => {
          setDuplicateGate(null);
          setContinuationChoice(null);
          setKaitenModalOpen(true);
        }}
      />
      <KaitenPreflightModal
        open={kaitenModalOpen}
        saving={saving}
        saveError={saveError}
        labDueLocal={workDueLocal}
        labDueMinLocal={dueLabMinLocal}
        labHmSlots={labDueHmSlots}
        onLabDueLocalChange={(raw) => {
          setLabDueAutoByPrice(false);
          setWorkDueLocal(
            raw === ""
              ? ""
              : snapDatetimeLocalToLabDueGrid(raw, labDueHmSlots),
          );
        }}
        onCloseModal={() => {
          setSaveError(null);
          setKaitenModalOpen(false);
          setContinuationChoice(null);
        }}
        onCancelCollapse={() => {
          setSaveError(null);
          setKaitenModalOpen(false);
          setContinuationChoice(null);
          onKaitenCancelCollapse();
        }}
        onConfirm={(payload, opts) => {
          void performSave(payload, opts?.printPdf === true);
        }}
      />
      {addClientOpen ? (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => {
            if (!addClientSaving) setAddClientOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-new-client-title`}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={`${titleId}-new-client-title`}
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Новый клиент
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              После сохранения поля «Заказчик» заполнятся автоматически.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor={`${titleId}-new-client-name`}
                  className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  Клиника — название{" "}
                  <span className="font-normal normal-case text-[var(--text-placeholder)]">
                    (необязательно)
                  </span>
                </label>
                <input
                  id={`${titleId}-new-client-name`}
                  type="text"
                  className={`${inputClass} mt-1`}
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Оставьте пустым для частного лица"
                  disabled={addClientSaving}
                  autoComplete="organization"
                />
              </div>
              <div>
                <label
                  htmlFor={`${titleId}-new-client-address`}
                  className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  Адрес клиники{" "}
                  <span className="font-normal normal-case text-[var(--text-placeholder)]">
                    (если указана клиника)
                  </span>
                </label>
                <textarea
                  id={`${titleId}-new-client-address`}
                  rows={2}
                  className={`${inputClass} mt-1 resize-y`}
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  placeholder="Город, улица…"
                  disabled={addClientSaving}
                />
              </div>
              <div>
                <label
                  htmlFor={`${titleId}-new-doctor-fio`}
                  className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  Доктор — ФИО{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  id={`${titleId}-new-doctor-fio`}
                  type="text"
                  className={`${inputClass} mt-1`}
                  value={newDoctorFio}
                  onChange={(e) => setNewDoctorFio(e.target.value)}
                  placeholder="Как в наряде"
                  disabled={addClientSaving}
                  autoComplete="name"
                />
              </div>
            </div>
            {addClientError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {addClientError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={addClientSaving}
                className="rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-strong)] hover:bg-[var(--card-bg)] disabled:opacity-50"
                onClick={() => {
                  if (!addClientSaving) setAddClientOpen(false);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={addClientSaving}
                className="rounded-full bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                onClick={() => void submitNewClient()}
              >
                {addClientSaving ? "Создание…" : "Создать и выбрать"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <header className="sticky top-0 z-20 shrink-0 space-y-2 overflow-visible border-b border-[var(--card-border)] bg-gradient-to-b from-[var(--surface-subtle)] to-[var(--card-bg)] px-3 py-3 max-md:pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-5">
        {continuationChoice ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
            <span>
              <span className="font-semibold">Продолжение работы: </span>
              наряд{" "}
              <Link
                href={orderPathById(continuationChoice.id)}
                prefetch={false}
                className="font-semibold text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
              >
                {continuationChoice.orderNumber}
              </Link>
            </span>
            <button
              type="button"
              className="text-xs font-medium text-sky-900 underline decoration-sky-600/50 underline-offset-2 hover:decoration-sky-900"
              onClick={() => setContinuationChoice(null)}
            >
              Снять связь
            </button>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <h2
                id={titleId}
                className="min-w-0 flex-1 text-sm font-semibold tabular-nums leading-snug tracking-tight text-[var(--app-text)] sm:flex-none sm:text-xl sm:leading-normal sm:tracking-tight"
                title="Ожидаемый номер (YYMM-NNN); итоговый при сохранении"
              >
                {isTestOrder ? "Тестовый наряд" : `Наряд ${nextOrderPreview ?? "…"}`}
              </h2>
              <div className="flex shrink-0 items-center gap-0.5 sm:hidden">
                <button
                  type="button"
                  onClick={() =>
                    setMobileHeaderDetailsOpen((open) => !open)
                  }
                  className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
                  aria-expanded={mobileHeaderDetailsOpen}
                  aria-label={
                    mobileHeaderDetailsOpen
                      ? "Скрыть статус и даты"
                      : "Показать статус и даты"
                  }
                  title={
                    mobileHeaderDetailsOpen
                      ? "Скрыть статус и даты"
                      : "Показать статус и даты"
                  }
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      mobileHeaderDetailsOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  onClick={onCollapse}
                  className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
                  aria-label="Свернуть окно"
                  title="Свернуть"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
                  aria-label="Закрыть"
                  title="Закрыть"
                >
                  <CloseIcon className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => void requestSave()}
                  disabled={saving}
                  className="h-8 min-w-0 shrink-0 rounded-md bg-[var(--sidebar-blue)] px-2 text-[0.62rem] font-semibold uppercase leading-none tracking-wide text-white shadow-sm transition-colors hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-60"
                >
                  {saving ? "…" : "Сохранить"}
                </button>
              </div>
            </div>
            <div
              className={[
                "flex min-w-0 flex-col gap-2 pb-0.5 sm:flex-row sm:items-stretch sm:gap-2.5",
                sourceEmails.length > 0 && "sm:pt-1.5",
                !mobileHeaderDetailsOpen && "max-md:hidden",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="flex shrink-0 flex-wrap items-stretch gap-2 sm:gap-2.5">
                <LabStatusPillMenu
                  compact
                  value={labWorkStatus}
                  onChange={setLabWorkStatus}
                />
                <UrgentPillMenu
                  value={urgentSelection}
                  onChange={setUrgentSelection}
                />
              </div>
              {/*
                Мобильный: три блока дат столбиком без горизонтальной прокрутки.
                Десктоп: полноразмерные блоки (min-w как у DueDatetimeComboPicker), в ряд без overflow-x.
              */}
              <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-stretch lg:flex-nowrap lg:gap-3">
                <DueDatetimeComboPicker
                  id={`${titleId}-work-received`}
                  label="Поступление"
                  labelPlacement="inside"
                  value={workReceivedLocal}
                  onChange={(raw) => {
                    setWorkReceivedLocal(
                      raw === "" ? "" : snapDatetimeLocalToDueGrid(raw),
                    );
                  }}
                  title="Когда зашла работа; если не указать — считается момент занесения наряда"
                  className="w-full min-w-0 sm:min-w-[12rem] sm:flex-1"
                />
                <DueDatetimeComboPicker
                  id={`${titleId}-work-due`}
                  label="Срок лаборатории"
                  labelPlacement="inside"
                  value={workDueLocal}
                  minLocal={dueLabMinLocal}
                  timeGrid="labDue"
                  labHmSlots={labDueHmSlots}
                  onChange={(raw) => {
                    setLabDueAutoByPrice(false);
                    const s =
                      raw === ""
                        ? ""
                        : snapDatetimeLocalToLabDueGrid(raw, labDueHmSlots);
                    setWorkDueLocal(s);
                    if (!s.trim()) {
                      setLabWholeDay(true);
                      return;
                    }
                    const hm = parseHmFromDueGridLocal(s);
                    if (hm && hm !== DUE_DAY_DEFAULT_HM) setLabWholeDay(false);
                  }}
                  title={`Срок лаборатории: ${labDueHmSlots.join(", ")} или «В теч. дня»`}
                  className="w-full min-w-0 sm:min-w-[12rem] sm:flex-1"
                  calendarFooter={
                    <label
                      htmlFor={`${titleId}-lab-whole-day`}
                      className="flex cursor-pointer items-center gap-2 text-[0.7rem] leading-tight text-[var(--text-secondary)] sm:text-xs"
                    >
                      <input
                        id={`${titleId}-lab-whole-day`}
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
                  id={`${titleId}-patient-appt`}
                  label="Запись"
                  labelPlacement="inside"
                  value={patientAppointmentLocal}
                  minLocal={dueDateMinLocal}
                  onChange={(raw) => {
                    const s =
                      raw === "" ? "" : snapDatetimeLocalToDueGrid(raw);
                    setPatientAppointmentLocal(s);
                    if (!s.trim()) {
                      setAppointmentWholeDay(true);
                      return;
                    }
                    const hm = parseHmFromDueGridLocal(s);
                    if (hm && hm !== DUE_DAY_DEFAULT_HM)
                      setAppointmentWholeDay(false);
                  }}
                  title="Дата и время записи пациента (8:00–23:30, шаг 30 мин)"
                  className="w-full min-w-0 sm:min-w-[12rem] sm:flex-1"
                  calendarFooter={
                    <label
                      htmlFor={`${titleId}-appt-whole-day`}
                      className="flex cursor-pointer items-center gap-2 text-[0.7rem] leading-tight text-[var(--text-secondary)] sm:text-xs"
                    >
                      <input
                        id={`${titleId}-appt-whole-day`}
                        type="checkbox"
                        className="rounded border-[var(--card-border)]"
                        checked={appointmentWholeDay}
                        onChange={(e) =>
                          setAppointmentWholeDay(e.target.checked)
                        }
                      />
                      В теч. дня
                    </label>
                  }
                />
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 flex-wrap items-center justify-end gap-1 sm:flex sm:pl-2">
            <button
              type="button"
              onClick={onCollapse}
              className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
              aria-label="Свернуть окно"
              title="Свернуть"
            >
              <ChevronDown className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
              aria-label="Закрыть"
              title="Закрыть"
            >
              <CloseIcon className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => void requestSave()}
              disabled={saving}
              className="h-11 rounded-md bg-[var(--sidebar-blue)] px-5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-60"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>

        {saveError ? (
          <p className="text-center text-sm text-red-600 sm:text-left">
            {saveError}
          </p>
        ) : null}
        {canUseTestOrder ? (
          <label className="flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)] sm:justify-start sm:text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--card-border)]"
              checked={isTestOrder}
              onChange={(e) => setIsTestOrder(e.target.checked)}
            />
            Тестовый наряд (без номера, без обязательных полей, без Kaiten)
          </label>
        ) : null}
      </header>

      <div className="relative z-0 shrink-0 overflow-x-hidden bg-[var(--card-bg)] px-3 py-2 sm:px-4 sm:py-2.5">
        <div>
            {loadError ? (
              <p className="mb-4 text-sm text-red-600">{loadError}</p>
            ) : null}

            <div className="grid grid-cols-1 gap-0 lg:grid-cols-3 lg:items-stretch lg:gap-x-0">
              <div className="flex min-h-0 min-w-0 flex-col space-y-0 lg:pr-6">
                <FormSection
                  title="Заказчик"
                  titleAction={
                    <button
                      type="button"
                      className="rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-strong)] shadow-sm transition-colors hover:border-[var(--input-border)] hover:bg-[var(--card-bg)] sm:text-sm"
                      onClick={() => {
                        setAddClientError(null);
                        setNewClientName("");
                        setNewClientAddress("");
                        setNewDoctorFio("");
                        setAddClientOpen(true);
                      }}
                    >
                      Добавить нового клиента
                    </button>
                  }
                  noTopBorder
                >
                  <FieldLabel htmlFor={`${titleId}-doctor`}>Доктор</FieldLabel>
                  <div>
                    <PrefixSearchCombobox
                      id={`${titleId}-doctor`}
                      className={`${inputClass} cursor-text`}
                      options={doctorComboboxOptions}
                      value={doctorId}
                      onChange={setDoctorId}
                      placeholder="Сначала выберите врача (ФИО)…"
                      emptyOptionLabel="Выбрать из списка"
                    />
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                      Без клиники — частная практика
                    </p>
                    {clinicId !== "" &&
                    clinicId !== ORDER_CLINIC_PRIVATE &&
                    doctorsForClinicVisible.length === 0 ? (
                      <p className="mt-1.5 text-xs text-amber-800">
                        В конфигурации пока нет врачей. Добавьте через «Новый
                        клиент» или раздел «Клиенты».
                      </p>
                    ) : null}
                    {!doctorId &&
                    allDoctors.filter((d) => d.id !== PLACEHOLDER_DOCTOR_ID)
                      .length === 0 ? (
                      <p className="mt-1.5 text-xs text-amber-800">
                        В справочнике нет врачей — добавьте в разделе «Клиенты».
                      </p>
                    ) : null}
                  </div>
                  <FieldLabel htmlFor={`${titleId}-clinic`}>Клиника</FieldLabel>
                  <div>
                    <PrefixSearchCombobox
                      id={`${titleId}-clinic`}
                      className={`${inputClass} cursor-text`}
                      options={clinicComboboxOptions}
                      value={clinicId}
                      onChange={onClinicChange}
                      placeholder="Необязательно: название клиники, ООО или юр. наименование…"
                      emptyOptionLabel="Выбрать из списка"
                    />
                    {clinicId === ORDER_CLINIC_PRIVATE ? (
                      <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                        Явно выбрана частная практика — тот же полный список
                        врачей, что и при пустой клинике.
                      </p>
                    ) : null}
                  </div>
                </FormSection>

                <FormSection title="Пациент">
                  <FieldLabel htmlFor={`${titleId}-patient`}>ФИО</FieldLabel>
                  <div>
                    <input
                      id={`${titleId}-patient`}
                      type="text"
                      className={inputClass}
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Фамилия И.О."
                      autoComplete="name"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mt-3 space-y-3 rounded-lg border border-[var(--card-border)]/90 bg-[var(--surface-muted)] p-3 sm:p-3.5">
                      <div>
                        <span className="mb-2 block text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-body)]">
                          Какие данные есть
                        </span>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                          <label className={checkboxLabelClass}>
                            <input
                              type="checkbox"
                              className={checkboxInputClass}
                              checked={hasScans}
                              onChange={(e) => setHasScans(e.target.checked)}
                            />
                            Сканы
                          </label>
                          <label className={checkboxLabelClass}>
                            <input
                              type="checkbox"
                              className={checkboxInputClass}
                              checked={hasCt}
                              onChange={(e) => setHasCt(e.target.checked)}
                            />
                            КТ
                          </label>
                          <label className={checkboxLabelClass}>
                            <input
                              type="checkbox"
                              className={checkboxInputClass}
                              checked={hasMri}
                              onChange={(e) => setHasMri(e.target.checked)}
                            />
                            МРТ
                          </label>
                          <label className={checkboxLabelClass}>
                            <input
                              type="checkbox"
                              className={checkboxInputClass}
                              checked={hasPhoto}
                              onChange={(e) => setHasPhoto(e.target.checked)}
                            />
                            Фото
                          </label>
                        </div>
                      </div>
                      <div className="border-t border-[var(--card-border)]/80 pt-3">
                        <label
                          htmlFor={`${titleId}-additional-source`}
                          className="mb-1.5 block text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-body)]"
                        >
                          Что ещё есть к работе
                        </label>
                        <textarea
                          id={`${titleId}-additional-source`}
                          className={`${inputClass} min-h-[2.75rem] max-h-[min(20vh,132px)] resize-y sm:min-h-[3rem]`}
                          rows={2}
                          maxLength={4000}
                          value={additionalSourceNotes}
                          onChange={(e) =>
                            setAdditionalSourceNotes(e.target.value)
                          }
                          placeholder="Модели, слепки, направления, доп. материалы…"
                        />
                        <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-0.5 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-1 py-0.5 sm:gap-1 sm:px-1.5 sm:py-1">
                          <span className="shrink-0 px-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)] sm:px-1 sm:text-[10px]">
                            Корр.
                          </span>
                          <button
                            type="button"
                            className={
                              correctionTrack == null
                                ? "rounded-full bg-[var(--sidebar-blue)] px-1.5 py-0.5 text-[10px] font-semibold text-white sm:px-2 sm:text-[11px]"
                                : "rounded-full px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)] sm:px-2 sm:text-[11px]"
                            }
                            onClick={() => setCorrectionTrack(null)}
                          >
                            —
                          </button>
                          {ORDER_CORRECTION_TRACK_VALUES.map((v) => (
                            <button
                              key={v}
                              type="button"
                              className={
                                correctionTrack === v
                                  ? "rounded-full bg-[var(--sidebar-blue)] px-1.5 py-0.5 text-[10px] font-semibold text-white sm:px-2 sm:text-[11px]"
                                  : "rounded-full px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)] sm:px-2 sm:text-[11px]"
                              }
                              title={ORDER_CORRECTION_TRACK_LABELS[v]}
                              onClick={() => setCorrectionTrack(v)}
                            >
                              <span className="sm:hidden">
                                {v === "ORTHOPEDICS"
                                  ? "Ортопед."
                                  : v === "ORTHODONTICS"
                                    ? "Ортод."
                                    : "Перед."}
                              </span>
                              <span className="hidden sm:inline">
                                {ORDER_CORRECTION_TRACK_LABELS[v]}
                              </span>
                            </button>
                          ))}
                        </div>
                        <OrderCorrectionDetails
                          track={correctionTrack}
                          reason={correctionReason}
                          paid={correctionPaid}
                          reasonId={`${titleId}-correction-reason`}
                          onReasonChange={setCorrectionReason}
                          onPaidChange={setCorrectionPaid}
                        />
                      </div>
                    </div>
                  </div>
                </FormSection>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col space-y-0 border-t border-[var(--card-border)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pr-6 lg:pt-0">
                <FormSection title="Финансы" noTopBorder>
                  <FieldLabel>Юр лицо</FieldLabel>
                  <div>
                    <select
                      className={selectClass}
                      value={legalEntity}
                      onChange={(e) => setLegalEntity(e.target.value)}
                    >
                      {LEGAL_ENTITIES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FieldLabel>Оплата</FieldLabel>
                  <div>
                    <select
                      className={selectClass}
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
                              (o === ORDER_PAYMENT_RECON_PAID
                                ? " · ОПЛАЧЕНО"
                                : " · НЕ ОПЛАЧЕНО")
                            : o}
                        </option>
                      ))}
                    </select>
                  </div>
                  {payment === ORDER_PAYMENT_PARTIAL ? (
                    <>
                      <FieldLabel htmlFor={`${titleId}-payment-partial`}>
                        Оплачено (руб.)
                      </FieldLabel>
                      <div>
                        <input
                          id={`${titleId}-payment-partial`}
                          type="number"
                          min={0}
                          step={1}
                          className={inputClass}
                          value={paymentPartialRubText}
                          onChange={(e) =>
                            setPaymentPartialRubText(e.target.value)
                          }
                          placeholder="Например, 15000"
                        />
                      </div>
                    </>
                  ) : null}
                </FormSection>

                <section className="mt-4 border-t border-[var(--card-border)] pt-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
                    Заказ от клиента
                  </h3>
                  <textarea
                    ref={clientOrderTextareaRef}
                    id={`${titleId}-client-order`}
                    className={`${inputClass} min-h-[72px] w-full resize-none overflow-hidden lg:min-h-[88px]`}
                    rows={3}
                    value={clientOrderText}
                    onChange={(e) => setClientOrderText(e.target.value)}
                    placeholder="Текст заказа от клиента…"
                  />
                </section>

                <CommentsSection
                  value={comments}
                  onChange={setComments}
                  className="mt-4"
                />
              </div>

              <div className="flex min-h-0 min-w-0 flex-col space-y-0 border-t border-[var(--card-border)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <OrderProstheticsBlock
                  value={prosthetics}
                  onChange={setProsthetics}
                />
                <section className="mt-4 border-t border-[var(--card-border)] pt-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
                    Файлы
                  </h3>
                  <OrderFilesPanel
                    orderId={null}
                    listenPaste
                    pendingFiles={pendingFiles}
                    onPendingChange={setPendingFiles}
                  />
                </section>
              </div>
            </div>

            {sourceEmails.length ? (
              <OrderSourceEmailsPanel
                emails={sourceEmails}
                onAppend={(email) =>
                  setClientOrderText((prev) => {
                    const block = sourceEmailToOrderText(email);
                    return prev.trim() ? `${prev.trim()}\n\n${block}` : block;
                  })
                }
              />
            ) : null}

            <PodrobnoSection
              lines={detailLines}
              clinicId={effectiveClinicIdForPrice}
              doctorId={doctorId || null}
              onLinesChange={setDetailLines}
            />

            <QuickOrderSection
              value={quickOrder}
              clinicId={effectiveClinicIdForPrice}
              doctorId={doctorId || null}
              onChange={setQuickOrder}
            />
        </div>
      </div>
    </div>
  );
}

function sourceEmailSender(email: OrderSourceEmail): string {
  return email.fromName || email.fromAddress || "Без отправителя";
}

function sourceEmailDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function sourceEmailToOrderText(email: OrderSourceEmail): string {
  const body = cleanMailTextBody(email.textBody || email.preview || "");
  const lines = [
    `Письмо: ${email.subject || "(без темы)"}`,
    `От: ${sourceEmailSender(email)}`,
    email.receivedAt ? `Дата: ${sourceEmailDate(email.receivedAt)}` : "",
    "",
    body,
  ].filter((line) => line !== "");
  return lines.join("\n");
}

function sourceEmailBody(email: OrderSourceEmail): string {
  return cleanMailTextBody(email.textBody || email.preview || "") || "В письме нет текстового содержимого.";
}

function sourceEmailHtml(email: OrderSourceEmail): string {
  const html = email.safeHtmlBody?.trim();
  if (html) return html;
  return `<pre style="white-space:pre-wrap;font:14px/1.6 Arial,sans-serif;color:CanvasText;background:Canvas">${sourceEmailBody(email)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</pre>`;
}

function OrderSourceEmailsPanel({
  emails,
  onAppend,
}: {
  emails: OrderSourceEmail[];
  onAppend: (email: OrderSourceEmail) => void;
}) {
  const [expandedEmail, setExpandedEmail] = useState<OrderSourceEmail | null>(null);

  if (typeof document === "undefined") return null;

  const mailOrderLeft = "clamp(1rem, 7vw, 8rem)";
  const mailOrderRight = "clamp(1rem, 7vw, 8rem)";
  const mailOrderGap = "0.75rem";
  const mailOrderTop = "max(0.5rem, 3dvh)";
  const mailSourceWidth = "clamp(20rem, 30vw, 28rem)";
  const mailOrderWidth = `min(calc(100vw - ${mailOrderLeft} - ${mailSourceWidth} - ${mailOrderGap} - ${mailOrderRight}), 1320px)`;

  return createPortal(
    <aside
      className="fixed z-[130] flex max-h-[min(92dvh,1180px)] flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 shadow-2xl"
      style={{
        top: mailOrderTop,
        left: `calc(${mailOrderLeft} + ${mailOrderWidth} + ${mailOrderGap})`,
        width: mailSourceWidth,
      }}
    >
      <div className="min-h-0 overflow-y-auto">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
              Письма
            </h3>
          </div>
        </div>
        <div className="space-y-3">
          {emails.map((email, index) => (
            <article
              key={email.id}
              className="rounded-[1.35rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Письмо {index + 1}
                  </div>
                  <h4 className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--app-text)]">
                    {email.subject || "(без темы)"}
                  </h4>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {email.receivedAt ? (
                    <time className="text-[0.68rem] font-medium text-[var(--text-muted)]">
                      {sourceEmailDate(email.receivedAt)}
                    </time>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
                    aria-label="Открыть письмо во всплывающем окне"
                    title="Открыть письмо во всплывающем окне"
                    onClick={() => setExpandedEmail(email)}
                  >
                    <ExpandIcon className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <p className="mt-2 truncate text-xs font-medium text-[var(--text-secondary)]">
                {sourceEmailSender(email)}
              </p>
              <p className="mt-3 max-h-44 overflow-y-auto whitespace-pre-wrap border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--text-body)]">
                {sourceEmailBody(email)}
              </p>
              {email.attachments.length ? (
                <div className="mt-3 space-y-1.5">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Вложения
                  </div>
                  {email.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={`/api/mail/emails/${email.id}/attachments/${attachment.id}`}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                    >
                      <span className="min-w-0 truncate">{attachment.fileName}</span>
                      <span className="shrink-0 text-[var(--text-muted)]">
                        {sourceFileSize(attachment.size)}
                      </span>
                    </a>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
                onClick={() => onAppend(email)}
              >
                Добавить текст в заказ
              </button>
            </article>
          ))}
        </div>
      </div>
      {expandedEmail && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/65 p-3 sm:p-6"
          role="presentation"
          onClick={() => setExpandedEmail(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр письма"
            className="flex h-[min(92dvh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] px-5 py-4">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Письмо
                </div>
                <h3 className="mt-1 text-lg font-semibold leading-snug text-[var(--app-text)]">
                  {expandedEmail.subject || "(без темы)"}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {sourceEmailSender(expandedEmail)}
                  {expandedEmail.receivedAt ? ` · ${sourceEmailDate(expandedEmail.receivedAt)}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
                aria-label="Закрыть просмотр письма"
                title="Закрыть"
                onClick={() => setExpandedEmail(null)}
              >
                <CloseIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <iframe
                title="Тело письма"
                sandbox="allow-same-origin allow-popups"
                srcDoc={`<!doctype html><html><head><base target="_blank"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px/1.6 Arial,sans-serif;color:CanvasText;background:Canvas} img{max-width:100%;height:auto} a{color:LinkText}</style></head><body>${sourceEmailHtml(expandedEmail)}</body></html>`}
                className="h-full min-h-[520px] w-full border border-[var(--border-subtle)] bg-[var(--card-bg)]"
              />
              {expandedEmail.attachments.length ? (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Вложения
                  </div>
                  {expandedEmail.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={`/api/mail/emails/${expandedEmail.id}/attachments/${attachment.id}`}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                    >
                      <span className="min-w-0 truncate">{attachment.fileName}</span>
                      <span className="shrink-0 text-[var(--text-muted)]">
                        {sourceFileSize(attachment.size)}
                      </span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="border-t border-[var(--card-border)] px-5 py-4">
              <button
                type="button"
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
                onClick={() => onAppend(expandedEmail)}
              >
                Добавить текст в заказ
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </aside>,
    document.body,
  );
}

function ExpandIcon(props: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-hidden"]}
    >
      <path d="M15 3h6v6" />
      <path d="M21 3l-7 7" />
      <path d="M9 21H3v-6" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

function ChevronDown(props: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden={props["aria-hidden"]}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CloseIcon(props: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden={props["aria-hidden"]}
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronMini({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 opacity-75 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function urgentPillStyles(selection: string): string {
  if (selection === URGENT_UNSET) {
    return "border border-dashed border-[var(--input-border)] bg-[var(--surface-muted)] text-[var(--text-placeholder)] ring-0 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]/90";
  }
  return "bg-red-200/95 text-red-950 ring-1 ring-red-400/60 hover:bg-red-300/90";
}

function urgentPillLabel(selection: string): string {
  if (selection === URGENT_UNSET) return "";
  const hit = URGENT_MENU_OPTIONS.find((o) => o.value === selection);
  return hit?.label ?? "";
}

function urgentPillAriaLabel(selection: string): string {
  if (selection === URGENT_UNSET) return "Срочность не задана. Открыть список";
  return `Срочность: ${urgentPillLabel(selection)}. Открыть список`;
}

function UrgentPillMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useMenuDismiss(open, close, wrapRef, listRef);
  const pos = useFixedDropdownPosition(open, buttonRef, {
    maxListHeight: 320,
    minWidthPx: 176,
  });
  const pillClass = urgentPillStyles(value);
  const label = urgentPillLabel(value);
  const isUnset = value === URGENT_UNSET;

  return (
    <div className="relative z-[1]" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex min-h-11 min-w-[7rem] max-w-[min(100vw-10rem,13rem)] items-center rounded-full py-2 text-left text-xs font-semibold uppercase tracking-wide shadow-sm ${pillClass} ${isUnset ? "justify-end gap-0 pl-3 pr-2" : "gap-1.5 px-3"}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={urgentPillAriaLabel(value)}
        onClick={() => setOpen((o) => !o)}
      >
        {!isUnset ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
        <ChevronMini open={open} />
      </button>
      {typeof document !== "undefined" && open
        ? createPortal(
            <ul
              ref={listRef}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                zIndex: 10000,
              }}
              className="overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl"
              role="listbox"
              aria-label="Срочность"
            >
              {URGENT_MENU_OPTIONS.map((opt) => (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    className={`flex w-full items-center px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide hover:bg-[var(--surface-hover)] ${
                      opt.value === value ? "bg-[var(--surface-hover)] text-[var(--app-text)]" : "text-[var(--text-body)]"
                    }`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

function FormSection({
  title,
  titleAction,
  children,
  noTopBorder,
  className = "",
  footer,
}: {
  title: string;
  titleAction?: ReactNode;
  children: ReactNode;
  noTopBorder?: boolean;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section
      className={`border-t border-[var(--card-border)] pt-3 ${noTopBorder ? "border-t-0 pt-0" : ""} ${className}`}
    >
      <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
          {title}
        </h3>
        {titleAction ? (
          <div className="flex w-full shrink-0 sm:w-auto sm:justify-end">
            {titleAction}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-x-1 gap-y-1 sm:grid-cols-[minmax(72px,100px)_1fr] sm:items-center">
        {children}
      </div>
      {footer}
    </section>
  );
}

function CommentsSection({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const textareaRef = useAutosizeTextarea(value, {
    maxHeight: COMMENTS_TEXTAREA_MAX_HEIGHT,
  });
  return (
    <section
      className={`border-t border-[var(--card-border)] pt-3 ${className}`}
    >
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
        Комментарии от админов
      </h3>
      <textarea
        ref={textareaRef}
        className={`${inputClass} min-h-[72px] w-full resize-none overflow-hidden lg:min-h-[88px]`}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Текст комментария от админов…"
      />
    </section>
  );
}

function FieldLabel({
  children,
  htmlFor,
  required: isRequired,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <label
      className="text-sm font-medium uppercase tracking-wide leading-tight text-[var(--text-secondary)] sm:text-base"
      htmlFor={htmlFor}
    >
      {children}
      {isRequired ? (
        <span className="text-red-600" aria-hidden>
          {" "}
          *
        </span>
      ) : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm outline-none transition-colors placeholder:text-[var(--text-placeholder)] focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";

const selectClass = `${inputClass} cursor-pointer`;

const checkboxLabelClass =
  "flex cursor-pointer items-center gap-2 text-sm font-medium uppercase tracking-wide text-[var(--text-strong)] select-none sm:text-base";

const checkboxInputClass =
  "h-4 w-4 shrink-0 rounded border-[var(--input-border)] text-[var(--sidebar-blue)] focus:ring-[var(--sidebar-blue)]";
