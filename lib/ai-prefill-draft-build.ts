import { ORDER_DRAFT_SNAPSHOT_VERSION, type OrderDraftSnapshot } from "@/lib/order-draft-snapshot";
import { ORDER_CLINIC_PRIVATE } from "@/lib/clients-order-ui";
import { ORDER_PAYMENT_NOT_PAID } from "@/lib/order-clinic-client-fields";
import { LAB_WORK_STATUS_DEFAULT } from "@/lib/lab-work-status";
import { URGENT_NO_COEF, URGENT_UNSET } from "@/lib/order-urgency";
import { mergeQuickOrderFromSnapshot } from "@/components/orders/new-order-form/quick-order-types";
import { emptyProsthetics } from "@/lib/order-prosthetics";
import type { DetailLine } from "@/components/orders/new-order-form/detail-lines";
import type { BridgeLineInput } from "@/lib/detail-lines-to-constructions";
import { isoToDatetimeLocal } from "@/lib/datetime-local";
import {
  DUE_DAY_DEFAULT_HM,
  parseHmFromDueGridLocal,
  snapDatetimeLocalToDueGrid,
  snapDatetimeLocalToLabDueGrid,
} from "@/lib/order-due-datetime";

export type AiPrefillConstructionRow = {
  category: string;
  priceListItemId?: string | null;
  priceListItem?: {
    id: string;
    code: string;
    name: string;
    priceRub: number;
    leadWorkingDays?: number | null;
    variablePrice?: boolean;
  } | null;
  quantity: number;
  unitPrice: number | null;
  teethFdi?: unknown;
  arch?: string | null;
};

/** Минимальный набор полей prediction для сборки черновика формы. */
export type AiPrefillPredictionInput = {
  patientName?: string | null;
  workDescription?: string | null;
  clientOrderText?: string | null;
  urgent?: boolean | null;
  hasScans?: boolean;
  hasCt?: boolean;
  hasMri?: boolean;
  hasPhoto?: boolean;
  legalEntity?: string | null;
  payment?: string | null;
  workReceivedAt?: string | null;
  dueDate?: string | null;
  dueToAdminsAt?: string | null;
  patientAppointmentAt?: string | null;
  resolvedConstructions?: AiPrefillConstructionRow[];
};

export type EmailAttachmentRow = {
  id: string;
  fileName: string;
  mimeType: string;
};

export function resolveClientIdsFromPrediction(
  prediction: {
    clinicId?: string | null;
    doctorId?: string | null;
  },
  sourceMatch?: { clinicId: string | null; doctorId: string | null; matched: boolean },
): { clinicId: string; doctorId: string } {
  if (sourceMatch?.matched && sourceMatch.doctorId) {
    return {
      clinicId: sourceMatch.clinicId ?? ORDER_CLINIC_PRIVATE,
      doctorId: sourceMatch.doctorId,
    };
  }
  const clinicId =
    prediction.clinicId != null && String(prediction.clinicId).trim()
      ? String(prediction.clinicId).trim()
      : prediction.clinicId === null
        ? ORDER_CLINIC_PRIVATE
        : "";
  const doctorId =
    prediction.doctorId != null && String(prediction.doctorId).trim()
      ? String(prediction.doctorId).trim()
      : "";
  return { clinicId, doctorId };
}

export function resolveSuggestedAttachments(
  emailAttachments: EmailAttachmentRow[],
  suggestedAttachmentIds: string[] | null | undefined,
): EmailAttachmentRow[] {
  if (!suggestedAttachmentIds?.length) return [];
  const byId = new Map(emailAttachments.map((a) => [a.id, a]));
  const out: EmailAttachmentRow[] = [];
  for (const id of suggestedAttachmentIds) {
    const hit = byId.get(id);
    if (hit) out.push(hit);
  }
  return out;
}

export function emptyVirtualOrderDraftSnapshot(): OrderDraftSnapshot {
  return {
    version: ORDER_DRAFT_SNAPSHOT_VERSION,
    activeTab: "Заказ",
    clinicId: "",
    doctorId: "",
    legalEntity: "Выбрать из списка",
    payment: ORDER_PAYMENT_NOT_PAID,
    patientName: "",
    clientOrderText: "",
    comments: "",
    hasScans: false,
    hasCt: false,
    hasMri: false,
    hasPhoto: false,
    additionalSourceNotes: "",
    urgentSelection: URGENT_UNSET,
    labWorkStatus: LAB_WORK_STATUS_DEFAULT,
    workDueLocal: "",
    patientAppointmentLocal: "",
    labWholeDay: true,
    appointmentWholeDay: true,
    workReceivedLocal: "",
    quickOrder: mergeQuickOrderFromSnapshot(),
    detailLines: [],
    bridgeLines: [],
    prosthetics: emptyProsthetics(),
    correctionTrack: null,
    correctionReason: "",
    correctionPaid: false,
  };
}

function newDraftDetailLineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `dl-${crypto.randomUUID()}`;
  }
  return `dl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function wholeDayFromDueLocal(local: string): boolean {
  const hm = parseHmFromDueGridLocal(local);
  return !(hm != null && hm !== DUE_DAY_DEFAULT_HM);
}

export function aiResolvedConstructionsToDetailDraft(
  rows: AiPrefillPredictionInput["resolvedConstructions"],
): { detailLines: DetailLine[]; bridgeLines: BridgeLineInput[] } {
  const detailLines: DetailLine[] = [];

  if (!rows?.length) {
    return { detailLines, bridgeLines: [] };
  }

  for (const r of rows) {
    if (r.category !== "PRICE_LIST" || !r.priceListItemId) continue;

    const teeth = Array.isArray(r.teethFdi)
      ? r.teethFdi.map(String).filter(Boolean)
      : [];
    const arch =
      r.arch === "UPPER" || r.arch === "LOWER" || r.arch === "BOTH"
        ? r.arch
        : null;
    detailLines.push({
      id: newDraftDetailLineId(),
      kind: "priceList",
      priceListItemId: r.priceListItemId,
      label: r.priceListItem?.name,
      leadWorkingDays: r.priceListItem?.leadWorkingDays ?? null,
      quantity: r.quantity,
      unitPrice: r.unitPrice ?? r.priceListItem?.priceRub ?? null,
      variablePrice: r.priceListItem?.variablePrice === true,
      teethFdi: teeth.length > 0 ? teeth : undefined,
      jawArch: arch,
    });
  }

  return { detailLines, bridgeLines: [] };
}

export function buildVirtualOrderDraftFromPrediction(
  prediction: AiPrefillPredictionInput,
  resolved: { clinicId: string; doctorId: string },
  opts?: { labDueHmSlots?: readonly string[] | null },
): OrderDraftSnapshot {
  const base = emptyVirtualOrderDraftSnapshot();
  const clientText =
    prediction.clientOrderText?.trim() ||
    prediction.workDescription?.trim() ||
    "";

  const { detailLines, bridgeLines } = aiResolvedConstructionsToDetailDraft(
    prediction.resolvedConstructions,
  );

  const workDueRaw = isoToDatetimeLocal(prediction.dueDate);
  const workDueLocal = workDueRaw
    ? snapDatetimeLocalToLabDueGrid(workDueRaw, opts?.labDueHmSlots)
    : "";

  const appointmentRaw = isoToDatetimeLocal(
    prediction.patientAppointmentAt ?? prediction.dueToAdminsAt,
  );
  const patientAppointmentLocal = appointmentRaw
    ? snapDatetimeLocalToDueGrid(appointmentRaw)
    : "";

  const workReceivedRaw = isoToDatetimeLocal(prediction.workReceivedAt);
  const workReceivedLocal = workReceivedRaw
    ? snapDatetimeLocalToDueGrid(workReceivedRaw)
    : "";

  return {
    ...base,
    clinicId: resolved.clinicId,
    doctorId: resolved.doctorId,
    patientName: prediction.patientName?.trim() ?? "",
    clientOrderText: clientText,
    urgentSelection: prediction.urgent === true ? URGENT_NO_COEF : URGENT_UNSET,
    hasScans: prediction.hasScans === true,
    hasCt: prediction.hasCt === true,
    hasMri: prediction.hasMri === true,
    hasPhoto: prediction.hasPhoto === true,
    legalEntity: prediction.legalEntity ?? base.legalEntity,
    payment: prediction.payment ?? base.payment,
    workDueLocal,
    patientAppointmentLocal,
    workReceivedLocal,
    labWholeDay: workDueLocal.trim() ? wholeDayFromDueLocal(workDueLocal) : true,
    appointmentWholeDay: patientAppointmentLocal.trim()
      ? wholeDayFromDueLocal(patientAppointmentLocal)
      : true,
    detailLines,
    bridgeLines,
  };
}
