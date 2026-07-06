import { ORDER_DRAFT_SNAPSHOT_VERSION, type OrderDraftSnapshot } from "@/lib/order-draft-snapshot";
import { ORDER_CLINIC_PRIVATE } from "@/lib/clients-order-ui";
import { ORDER_PAYMENT_NOT_PAID } from "@/lib/order-clinic-client-fields";
import { LAB_WORK_STATUS_DEFAULT } from "@/lib/lab-work-status";
import { URGENT_NO_COEF, URGENT_UNSET } from "@/lib/order-urgency";
import { mergeQuickOrderFromSnapshot } from "@/components/orders/new-order-form/quick-order-types";
import { emptyProsthetics } from "@/lib/order-prosthetics";

export type AiPredictionJson = {
  patientName?: string | null;
  clinicId?: string | null;
  doctorId?: string | null;
  clinicHint?: string | null;
  doctorHint?: string | null;
  workDescription?: string | null;
  urgent?: boolean | null;
  warnings?: string[];
  suggestedAttachmentIds?: string[];
  matchedBySourceEmail?: boolean;
  sourceEmailAmbiguous?: boolean;
};

export type EmailAttachmentRow = {
  id: string;
  fileName: string;
  mimeType: string;
};

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

export function resolveClientIdsFromPrediction(
  prediction: AiPredictionJson,
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

export function buildVirtualOrderDraftFromPrediction(
  prediction: AiPredictionJson,
  resolved: { clinicId: string; doctorId: string },
): OrderDraftSnapshot {
  const base = emptyVirtualOrderDraftSnapshot();
  return {
    ...base,
    clinicId: resolved.clinicId,
    doctorId: resolved.doctorId,
    patientName: prediction.patientName?.trim() ?? "",
    clientOrderText: prediction.workDescription?.trim() ?? "",
    urgentSelection: prediction.urgent === true ? URGENT_NO_COEF : URGENT_UNSET,
  };
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
