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
  legalEntitySelectFromClinicBilling,
  ORDER_PAYMENT_SVERKA,
  sverkaPaymentSelectLabel,
  withExtraSelectOption,
} from "@/lib/order-clinic-client-fields";
import {
  URGENT_MENU_OPTIONS,
  URGENT_NO_COEF,
  URGENT_UNSET,
} from "@/lib/order-urgency";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";
import { OrderFilesPanel } from "@/components/orders/OrderFilesPanel";
import type { BridgeLineInput } from "@/lib/detail-lines-to-constructions";
import { detailLinesAndBridgesToConstructionsJson } from "@/lib/detail-lines-to-constructions";
import { constructionsFromQuickOrder } from "@/lib/quick-order-constructions";
import {
  loadQuickOrderTemplate,
  quickOrderTemplateAsNewOrderDefaults,
  saveQuickOrderTemplate,
} from "@/lib/quick-order-template-storage";
import { printOrderNarjadPdf } from "@/lib/print-order-narjad";
import { OrderProstheticsBlock } from "@/components/orders/OrderProstheticsBlock";
import { PodrobnoSection } from "./PodrobnoSection";
import type { DetailLine } from "./detail-lines";
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
  earliestDueGridLocalFromCreatedAt,
  snapDatetimeLocalToDueGrid,
} from "@/lib/order-due-datetime";

type DoctorRow = { id: string; fullName: string };
type ClinicRow = {
  id: string;
  name: string;
  address?: string | null;
  isActive?: boolean;
  legalFullName?: string | null;
  billingLegalForm?: "IP" | "OOO" | null;
  worksWithReconciliation?: boolean;
  reconciliationFrequency?: "MONTHLY_1" | "MONTHLY_2" | null;
  doctors: DoctorRow[];
};

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

export function NewOrderForm({
  panelId,
  titleId,
  initialSnapshot,
  onCollapse,
  onClose,
  onAfterSuccessfulSave,
  onKaitenCancelCollapse,
}: {
  panelId: string;
  titleId: string;
  initialSnapshot?: OrderDraftSnapshot | null;
  onCollapse: () => void;
  onClose: () => void;
  onAfterSuccessfulSave: () => void;
  onKaitenCancelCollapse: () => void;
}) {
  const router = useRouter();
  const { registerPanelSnapshot } = useNewOrderPanel();
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
  const [payment, setPayment] = useState<string>(PAYMENT_OPTIONS[0]);
  const [patientName, setPatientName] = useState("");
  const [clientOrderText, setClientOrderText] = useState("");
  const [comments, setComments] = useState("");
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
  const [formOpenedAtIso] = useState(() => new Date().toISOString());
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
  const [detailLines, setDetailLines] = useState<DetailLine[]>([]);
  const [bridgeLines, setBridgeLines] = useState<BridgeLineInput[]>([]);
  const [prosthetics, setProsthetics] = useState<OrderProstheticsV1>(() =>
    emptyProsthetics(),
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [kaitenModalOpen, setKaitenModalOpen] = useState(false);
  const [duplicateGate, setDuplicateGate] = useState<DuplicateGateState | null>(
    null,
  );
  const [continuationChoice, setContinuationChoice] =
    useState<ContinuationParent | null>(null);
  const [nextOrderPreview, setNextOrderPreview] = useState<string | null>(null);
  const [correctionTrack, setCorrectionTrack] =
    useState<OrderCorrectionTrackValue | null>(null);
  const hydratedRef = useRef(false);
  const prevClinicIdForLegalRef = useRef<string | null>(null);

  const selectedClinic = useMemo(
    () =>
      clinicId && clinicId !== ORDER_CLINIC_PRIVATE
        ? clinics.find((c) => c.id === clinicId)
        : undefined,
    [clinicId, clinics],
  );

  const dueDateMinLocal = useMemo(
    () => earliestDueGridLocalFromCreatedAt(formOpenedAtIso),
    [formOpenedAtIso],
  );

  const paymentSelectOptions = useMemo(() => {
    const includeSverka = selectedClinic?.worksWithReconciliation === true;
    const noSverka = PAYMENT_OPTIONS.filter((p) => p !== ORDER_PAYMENT_SVERKA);
    const base = includeSverka
      ? [...noSverka, ORDER_PAYMENT_SVERKA]
      : [...noSverka];
    return withExtraSelectOption(base, payment);
  }, [selectedClinic, payment]);

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
    if (row.worksWithReconciliation === true) {
      setPayment((prev) => {
        const unset =
          prev === PAYMENT_OPTIONS[0] || prev === "Не выбрано";
        return unset ? ORDER_PAYMENT_SVERKA : prev;
      });
    }
  }, [clinicId, clinics]);

  /** «Сверка» в оплате только если в карточке клиники включена сверка. */
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
    setPayment(s.payment);
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
    setWorkDueLocal(snapDatetimeLocalToDueGrid(s.workDueLocal ?? ""));
    setPatientAppointmentLocal(
      "patientAppointmentLocal" in s && typeof s.patientAppointmentLocal === "string"
        ? snapDatetimeLocalToDueGrid(s.patientAppointmentLocal)
        : "",
    );
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
    if (ct === "ORTHOPEDICS" || ct === "ORTHODONTICS") {
      setCorrectionTrack(ct);
    } else {
      setCorrectionTrack(null);
    }
  }, [initialSnapshot]);

  const orderDraftSnapshot = useMemo<OrderDraftSnapshot>(
    () => ({
      version: ORDER_DRAFT_SNAPSHOT_VERSION,
      activeTab: "Заказ",
      clinicId,
      doctorId,
      legalEntity,
      payment,
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
      workReceivedLocal,
      quickOrder: JSON.parse(JSON.stringify(quickOrder)),
      detailLines: JSON.parse(JSON.stringify(detailLines)),
      bridgeLines: JSON.parse(JSON.stringify(bridgeLines)),
      prosthetics: JSON.parse(JSON.stringify(prosthetics)),
      correctionTrack,
    }),
    [
      clinicId,
      doctorId,
      legalEntity,
      payment,
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
      workReceivedLocal,
      quickOrder,
      detailLines,
      bridgeLines,
      prosthetics,
      correctionTrack,
    ],
  );

  useEffect(() => {
    return registerPanelSnapshot(panelId, () => orderDraftSnapshot);
  }, [panelId, registerPanelSnapshot, orderDraftSnapshot]);

  /** Шаблон плашек для следующих окон «Новый наряд» (браузер, localStorage). */
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

  const clinicComboboxOptions = useMemo(
    () => [
      ...clinics.map((c) => ({
        value: c.id,
        label: clinicSelectLabel(c),
        searchPrefixes: clinicComboboxSearchPrefixes(c),
      })),
      {
        value: ORDER_CLINIC_PRIVATE,
        label: "Частная практика (врач)",
      },
    ],
    [clinics],
  );

  const doctorComboboxOptions = useMemo(
    () =>
      doctorsForClinic.map((d) => ({ value: d.id, label: d.fullName })),
    [doctorsForClinic],
  );

  const onClinicChange = useCallback(
    (id: string) => {
      setClinicId(id);
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
    if (!doctorId) {
      setSaveError("Выберите врача");
      return;
    }
    if (!patientName.trim()) {
      setSaveError("Укажите ФИО пациента");
      return;
    }
    if (!patientAppointmentLocal.trim()) {
      setSaveError("Укажите дату записи (Запись)");
      return;
    }

    const clinicParam =
      clinicId === ORDER_CLINIC_PRIVATE ? "" : clinicId.trim();
    const qs = new URLSearchParams({
      doctorId,
      patientName: patientName.trim(),
      clinicId: clinicParam,
    });

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
  }, [clinicId, doctorId, patientName, patientAppointmentLocal]);

  const performSave = useCallback(
    async (kaiten: KaitenSavePayload, printAfterSave = false) => {
      const appointmentIso = localDateTimeToIso(
        snapDatetimeLocalToDueGrid(patientAppointmentLocal),
      );
      if (!appointmentIso) {
        setSaveError("Укажите корректную дату записи (Запись)");
        return;
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
            doctorId,
            patientName: patientName.trim() || null,
            legalEntity:
              legalEntity === LEGAL_ENTITIES[0] ? null : legalEntity,
            payment: payment === PAYMENT_OPTIONS[0] ? null : payment,
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
              ? localDateTimeToIso(snapDatetimeLocalToDueGrid(workDueLocal))
              : null,
            dueToAdminsAt: appointmentIso,
            kaitenAdminDueHasTime: true,
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
            ...(continuationChoice
              ? { continuesFromOrderId: continuationChoice.id }
              : {}),
            ...(kaiten.kaitenDecideLater
              ? { kaitenDecideLater: true }
              : {
                  kaitenDecideLater: false,
                  kaitenCardTypeId: kaiten.kaitenCardTypeId,
                  kaitenTrackLane: kaiten.kaitenTrackLane,
                  kaitenCardTitleLabel: kaiten.kaitenCardTitleLabel,
                }),
          }),
        });
        const data = (await res.json()) as { id?: string; error?: string };
        if (!res.ok) {
          setSaveError(data.error ?? "Ошибка сохранения");
          return;
        }
        const newId = data.id;
        if (newId && pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            const safeName = encodeURIComponent(file.name || "file");
            await fetch(`/api/orders/${newId}/attachments`, {
              method: "POST",
              credentials: "include",
              headers: {
                "content-type": "application/octet-stream",
                "x-upload-filename": safeName,
                "x-upload-mime": file.type || "application/octet-stream",
              },
              body: file,
            });
          }
          setPendingFiles([]);
        }
        if (printAfterSave && newId) {
          try {
            await printOrderNarjadPdf(newId);
          } catch {
            /* наряд уже сохранён */
          }
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
      patientName,
      legalEntity,
      payment,
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
      patientAppointmentLocal,
      workReceivedLocal,
      quickOrder,
      detailLines,
      bridgeLines,
      prosthetics,
      correctionTrack,
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
        labDueMinLocal={dueDateMinLocal}
        onLabDueLocalChange={(raw) => {
          setWorkDueLocal(
            raw === "" ? "" : snapDatetimeLocalToDueGrid(raw),
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
                href={`/orders/${continuationChoice.id}`}
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
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2
              id={titleId}
              className="shrink-0 text-lg font-semibold tracking-tight text-[var(--app-text)] sm:text-xl"
              title="Ожидаемый номер (YYMM-NNN); итоговый при сохранении"
            >
              Наряд {nextOrderPreview ?? "…"}
            </h2>
            <div className="flex min-w-0 flex-nowrap items-stretch gap-2 pb-0.5 sm:gap-2.5">
              <div className="flex shrink-0 items-stretch gap-2 sm:gap-2.5">
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
              <div className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-stretch gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:thin] sm:gap-2.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--input-border)]">
              <DueDatetimeComboPicker
                id={`${titleId}-work-received`}
                label="Поступление"
                labelPlacement="inside"
                fitRow
                value={workReceivedLocal}
                onChange={(raw) => {
                  setWorkReceivedLocal(
                    raw === "" ? "" : snapDatetimeLocalToDueGrid(raw),
                  );
                }}
                title="Когда зашла работа; если не указать — считается момент занесения наряда"
                className="min-w-0 max-w-[15rem] shrink flex-[1_1_8.5rem]"
              />
              <DueDatetimeComboPicker
                id={`${titleId}-work-due`}
                label="Срок лаборатории"
                labelPlacement="inside"
                fitRow
                value={workDueLocal}
                minLocal={dueDateMinLocal}
                onChange={(raw) => {
                  setWorkDueLocal(
                    raw === "" ? "" : snapDatetimeLocalToDueGrid(raw),
                  );
                }}
                title="Срок лаборатории (8:00–23:30, шаг 30 мин)"
                className="min-w-0 max-w-[15rem] shrink flex-[1_1_8.5rem]"
              />
              <DueDatetimeComboPicker
                id={`${titleId}-patient-appt`}
                label="Запись"
                labelPlacement="inside"
                fitRow
                value={patientAppointmentLocal}
                minLocal={dueDateMinLocal}
                onChange={(raw) => {
                  setPatientAppointmentLocal(
                    raw === "" ? "" : snapDatetimeLocalToDueGrid(raw),
                  );
                }}
                title="Дата и время записи пациента (8:00–23:30, шаг 30 мин)"
                className="min-w-0 max-w-[15rem] shrink flex-[1_1_8.5rem]"
              />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:pl-2">
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
                      Сначала выберите врача. Без клиники (пустое поле ниже или
                      «Частная практика») наряд сохранится как частное лицо — в
                      списке все врачи справочника.
                    </p>
                    {clinicId !== "" &&
                    clinicId !== ORDER_CLINIC_PRIVATE &&
                    doctorsForClinic.length === 0 ? (
                      <p className="mt-1.5 text-xs text-amber-800">
                        В конфигурации пока нет врачей. Добавьте через «Новый
                        клиент» или раздел «Клиенты».
                      </p>
                    ) : null}
                    {!doctorId && allDoctors.length === 0 ? (
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
                                {v === "ORTHOPEDICS" ? "Ортопед." : "Ортод."}
                              </span>
                              <span className="hidden sm:inline">
                                {ORDER_CORRECTION_TRACK_LABELS[v]}
                              </span>
                            </button>
                          ))}
                        </div>
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
                </FormSection>

                <section className="mt-4 border-t border-[var(--card-border)] pt-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
                    Заказ от клиента
                  </h3>
                  <textarea
                    id={`${titleId}-client-order`}
                    className={`${inputClass} min-h-[72px] max-h-[min(28vh,200px)] w-full resize-y lg:min-h-[88px]`}
                    rows={4}
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

            <PodrobnoSection
              lines={detailLines}
              onLinesChange={setDetailLines}
            />

            <QuickOrderSection value={quickOrder} onChange={setQuickOrder} />
        </div>
      </div>
    </div>
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
  const close = useCallback(() => setOpen(false), []);
  useMenuDismiss(open, close, wrapRef);
  const pillClass = urgentPillStyles(value);
  const label = urgentPillLabel(value);
  const isUnset = value === URGENT_UNSET;

  return (
    <div className="relative z-[1]" ref={wrapRef}>
      <button
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
      {open ? (
        <ul
          className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl"
          role="listbox"
          aria-label="Коэффициент срочности"
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
        </ul>
      ) : null}
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
  return (
    <section
      className={`border-t border-[var(--card-border)] pt-3 ${className}`}
    >
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
        Комментарии
      </h3>
      <textarea
        className={`${inputClass} min-h-[72px] max-h-[min(28vh,200px)] w-full resize-y lg:min-h-[88px]`}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Текст комментария…"
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
