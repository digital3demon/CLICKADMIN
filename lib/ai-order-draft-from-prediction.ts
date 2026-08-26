import type { PrismaClient } from "@prisma/client";
import type { OrderEditInitial } from "@/components/orders/OrderEditForm";
import { ORDER_CLINIC_PRIVATE } from "@/lib/clients-order-ui";
import { ORDER_PAYMENT_NOT_PAID } from "@/lib/order-clinic-client-fields";
import { LAB_WORK_STATUS_DEFAULT } from "@/lib/lab-work-status";
import { URGENT_NO_COEF, URGENT_UNSET } from "@/lib/order-urgency";
import { emptyProsthetics } from "@/lib/order-prosthetics";
import { compositionLinesToOrderConstructions } from "@/lib/llm/resolve-ai-composition-lines";
import { fetchOrderSourceEmails } from "@/lib/mail/order-source-emails";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";
import { predictionNeedsReEnrichment } from "@/lib/llm/order-email-enrichment-version";
import {
  resolveClientIdsFromPrediction,
  type EmailAttachmentRow,
} from "@/lib/ai-prefill-draft-build";
export {
  aiResolvedConstructionsToDetailDraft,
  buildVirtualOrderDraftFromPrediction,
  emptyVirtualOrderDraftSnapshot,
  resolveClientIdsFromPrediction,
  resolveSuggestedAttachments,
  type EmailAttachmentRow,
} from "@/lib/ai-prefill-draft-build";

export type AiPredictionJson = {
  patientName?: string | null;
  clinicId?: string | null;
  doctorId?: string | null;
  clinicHint?: string | null;
  doctorHint?: string | null;
  workDescription?: string | null;
  clientOrderText?: string | null;
  urgent?: boolean | null;
  warnings?: string[];
  awaitingData?: { isAwaiting: boolean; reason: string | null } | null;
  suggestedAttachmentIds?: string[];
  matchedBySourceEmail?: boolean;
  sourceEmailAmbiguous?: boolean;
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
  confidenceScore?: number | null;
  resolvedConstructions?: OrderEditInitial["constructions"];
  compositionLineCount?: number;
  compositionHints?: Array<{ nameHint: string; quantity?: number | null; teethFdi?: string[] | null }>;
  resolvedClinicName?: string | null;
  resolvedDoctorName?: string | null;
  enrichmentVersion?: number;
};

export function buildVirtualOrderEditInitialFromPrediction(
  prediction: AiPredictionJson,
  resolved: { clinicId: string; doctorId: string },
  opts: {
    predictionId: string;
    labDueHmSlots: string[];
    productionCalendarCountry?: string;
  },
): OrderEditInitial {
  const nowIso = new Date().toISOString();
  const workReceivedIso = prediction.workReceivedAt ?? null;
  const clinicId =
    resolved.clinicId === ORDER_CLINIC_PRIVATE || !resolved.clinicId.trim()
      ? null
      : resolved.clinicId.trim();
  const doctorId = resolved.doctorId.trim();
  const isUrgent = prediction.urgent === true;
  const clientText =
    prediction.clientOrderText?.trim() ||
    prediction.workDescription?.trim() ||
    null;

  const constructions =
    prediction.resolvedConstructions ??
    compositionLinesToOrderConstructions([]);

  return {
    id: `virtual-ai-${opts.predictionId}`,
    orderNumber: "—",
    clinicId,
    doctorId,
    patientName: prediction.patientName?.trim() || null,
    notes: null,
    clientOrderText: clientText,
    labWorkStatus: LAB_WORK_STATUS_DEFAULT,
    isUrgent,
    urgentCoefficient: null,
    dueDate: prediction.dueDate ?? null,
    dueToAdminsAt: prediction.dueToAdminsAt ?? prediction.patientAppointmentAt ?? null,
    kaitenAdminDueHasTime: true,
    dueToAdminsHasTime: true,
    workReceivedAt: workReceivedIso,
    createdAt: workReceivedIso ?? nowIso,
    labDueHmSlots: opts.labDueHmSlots,
    productionCalendarCountry: opts.productionCalendarCountry,
    invoiceIssued: false,
    invoiceNumber: null,
    invoicePaperDocs: false,
    invoiceSentToEdo: false,
    invoiceEdoSigned: false,
    invoicePrinted: false,
    updNumber: null,
    updPrinted: false,
    updAttachmentId: null,
    narjadPrinted: false,
    adminShippedOtpr: false,
    shippedDescription: null,
    invoiceParsedLines: null,
    invoiceParsedTotalRub: null,
    invoiceMismatchAckFingerprint: null,
    invoiceParsedSummaryText: null,
    invoicePaymentNotes: null,
    orderPriceListKind: null,
    workspaceActivePriceListName: null,
    orderPriceListNote: null,
    prostheticsOrdered: false,
    correctionTrack: null,
    correctionReason: null,
    correctionPaid: false,
    registeredByLabel: null,
    courierId: null,
    courierName: null,
    courierPickupId: null,
    courierPickupName: null,
    courierDeliveryId: null,
    courierDeliveryName: null,
    legalEntity: prediction.legalEntity ?? null,
    payment: prediction.payment ?? ORDER_PAYMENT_NOT_PAID,
    paymentPartialRub: null,
    excludeFromReconciliation: false,
    excludeFromReconciliationUntil: null,
    hasScans: prediction.hasScans === true,
    hasCt: prediction.hasCt === true,
    hasMri: prediction.hasMri === true,
    hasPhoto: prediction.hasPhoto === true,
    additionalSourceNotes: null,
    constructions,
    compositionDiscountPercent: 0,
    depositAppliedRub: null,
    depositAppliedParty: null,
    depositBalanceRub: 0,
    depositClinicBalanceRub: 0,
    depositDoctorBalanceRub: 0,
    financeCalculated: false,
    prosthetics: emptyProsthetics(),
    kaitenCardId: null,
    kaitenCardTitleLabel: null,
    kaitenDecideLater: false,
    kaitenSyncError: null,
    kaitenCardTypeId: null,
    kaitenCardTypeName: null,
    demoKanbanColumn: null,
    kaitenColumnTitle: null,
    kaitenCardUrl: null,
    kaitenTrackLane: null,
    kaitenBlocked: false,
    kaitenBlockReason: null,
    invoiceAttachmentId: null,
    invoiceAttachmentCreatedAt: null,
    continuesFromOrder: null,
    continuationFollowups: [],
    chatCorrections: [],
    prostheticsRequests: [],
    sourceEmailCount: 0,
  };
}

export function collectAttachmentsFromSourceEmails(
  emails: Awaited<ReturnType<typeof fetchOrderSourceEmails>>,
): EmailAttachmentRow[] {
  const byId = new Map<string, EmailAttachmentRow>();
  for (const email of emails) {
    for (const att of email.attachments) {
      byId.set(att.id, {
        id: att.id,
        fileName: att.fileName,
        mimeType: att.mimeType,
      });
    }
  }
  return [...byId.values()];
}

export { predictionNeedsReEnrichment };

export async function ensurePredictionEnriched(
  db: PrismaClient,
  tenantId: string,
  input: {
    predictionId: string;
    orderId: string;
    emailId: string;
    predictionJson: AiPredictionJson;
    persist?: boolean;
  },
): Promise<AiPredictionJson> {
  const orderSourceEmails = await fetchOrderSourceEmails(db, tenantId, input.orderId);
  const allAttachments = collectAttachmentsFromSourceEmails(orderSourceEmails);

  const email = await db.email.findUnique({
    where: { id: input.emailId },
    select: { fromAddress: true },
  });

  let predictionJson = input.predictionJson;
  const sourceMatch = email
    ? await resolveClientIdsFromOrderSourceEmail(db, tenantId, email.fromAddress, {
        preferOrderId: input.orderId,
      })
    : { clinicId: null, doctorId: null, matched: false, ambiguous: false };

  const effectiveSourceMatch = sourceMatch.matched
    ? sourceMatch
    : predictionJson.matchedBySourceEmail
      ? {
          clinicId: predictionJson.clinicId ?? null,
          doctorId: predictionJson.doctorId ?? null,
          matched: true,
        }
      : undefined;

  const resolvedIds = resolveClientIdsFromPrediction(predictionJson, effectiveSourceMatch);

  if (predictionNeedsReEnrichment(predictionJson as Record<string, unknown>)) {
    predictionJson = await reEnrichPredictionForVirtualOrder(db, tenantId, {
      orderId: input.orderId,
      primaryEmailId: input.emailId,
      predictionJson,
      attachments: allAttachments,
      resolvedClinicId: resolvedIds.clinicId,
      resolvedDoctorId: resolvedIds.doctorId,
    });

    if (input.persist !== false) {
      await db.aiOrderPrediction.update({
        where: { id: input.predictionId },
        data: { predictionJson: predictionJson as object },
      });
    }
  }

  return predictionJson;
}

export async function reEnrichPredictionForVirtualOrder(
  db: Parameters<
    typeof import("@/lib/llm/order-email-enrichment").enrichOrderEmailPrediction
  >[0],
  tenantId: string,
  input: {
    orderId: string;
    primaryEmailId: string;
    predictionJson: AiPredictionJson;
    attachments: EmailAttachmentRow[];
    resolvedClinicId: string;
    resolvedDoctorId: string;
  },
): Promise<AiPredictionJson> {
  const { enrichOrderEmailPrediction } = await import("@/lib/llm/order-email-enrichment");
  const enriched = await enrichOrderEmailPrediction(db, tenantId, {
    orderId: input.orderId,
    primaryEmailId: input.primaryEmailId,
    ai: input.predictionJson as Record<string, unknown>,
    attachments: input.attachments,
    resolvedClinicId: input.resolvedClinicId,
    resolvedDoctorId: input.resolvedDoctorId,
  });
  return enriched as AiPredictionJson;
}
