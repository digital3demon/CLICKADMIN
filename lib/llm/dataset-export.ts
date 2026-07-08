import "server-only";
import type { PrismaClient } from "@prisma/client";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";
import {
  buildOrderEmailExtractUserPrompt,
  formatAttachmentsForPrompt,
  formatEmailBlocksForPrompt,
  loadClinicDoctorCatalogText,
  type EmailAttachmentCatalogItem,
  type EmailBlockForExtract,
} from "@/lib/llm/order-email-extract";
import {
  compositionHintsFromOrderConstructions,
  emailAttachmentIdsMatchingOrderFiles,
  scanLikeEmailAttachmentIds,
} from "@/lib/llm/order-email-export-ground-truth";
import { fetchClientOrderHistoryContext } from "@/lib/llm/client-history-context";
import { cleanMailTextBody } from "@/lib/mail/mail-text-cleanup";

export function emailBodyText(email: {
  textBody: string | null;
  preview: string | null;
}): string {
  return cleanMailTextBody(email.textBody) || cleanMailTextBody(email.preview) || "";
}

export function groundTruthSuggestedAttachmentIds(
  order: {
    hasScans: boolean | null;
    attachments: Array<{ fileName: string; mimeType: string }>;
  },
  emailAttachments: EmailAttachmentCatalogItem[],
): string[] {
  const matched = emailAttachmentIdsMatchingOrderFiles(order.attachments, emailAttachments);
  if (matched.length > 0) return matched;
  if (order.hasScans) return scanLikeEmailAttachmentIds(emailAttachments);
  return [];
}

export type OrderForDataset = {
  id: string;
  createdAt: Date;
  patientName: string | null;
  clinicId: string | null;
  doctorId: string | null;
  clientOrderText: string | null;
  isUrgent: boolean | null;
  workReceivedAt: Date | null;
  dueDate: Date | null;
  dueToAdminsAt: Date | null;
  hasScans: boolean | null;
  hasCt: boolean | null;
  hasMri: boolean | null;
  hasPhoto: boolean | null;
  legalEntity: string | null;
  payment: string | null;
  attachments: Array<{ fileName: string; mimeType: string }>;
  constructions: Array<{
    quantity: number;
    teethFdi: unknown;
    priceListItem: { code: string | null; name: string } | null;
  }>;
};

export type EmailForDataset = {
  id: string;
  subject: string | null;
  textBody: string | null;
  preview: string | null;
  fromAddress: string | null;
  receivedAt: Date | null;
  attachments: Array<{ id: string; fileName: string; mimeType: string; size: number }>;
};

export async function buildDatasetJsonlLine(
  db: PrismaClient,
  tenantId: string,
  order: OrderForDataset,
  emails: EmailForDataset[],
  catalogText?: string,
): Promise<string | null> {
  const attachmentMap = new Map<string, EmailAttachmentCatalogItem>();
  const emailBlocks: EmailBlockForExtract[] = [];
  let primaryEmailId: string | null = null;
  let primaryFromAddress: string | null = null;

  for (const email of emails) {
    const body = emailBodyText(email);
    if (!body.trim()) continue;
    if (!primaryEmailId) {
      primaryEmailId = email.id;
      primaryFromAddress = email.fromAddress;
    }
    emailBlocks.push({
      id: email.id,
      subject: email.subject,
      textBody: body,
      isPrimary: email.id === primaryEmailId,
    });
    for (const a of email.attachments) {
      attachmentMap.set(a.id, {
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
      });
    }
  }

  if (emailBlocks.length === 0) return null;

  const emailAttachments = [...attachmentMap.values()];
  const attachmentsText = formatAttachmentsForPrompt(emailAttachments);
  const emailsText = formatEmailBlocksForPrompt(emailBlocks);

  const sourceMatch = await resolveClientIdsFromOrderSourceEmail(
    db,
    tenantId,
    primaryFromAddress,
    { preferOrderId: order.id },
  );

  const preResolved =
    sourceMatch.matched && sourceMatch.doctorId
      ? { clinicId: sourceMatch.clinicId, doctorId: sourceMatch.doctorId }
      : null;

  const historyContext = await fetchClientOrderHistoryContext(
    db,
    tenantId,
    preResolved?.doctorId ?? null,
    order.patientName,
    order.createdAt,
  );

  const finalCatalogText = catalogText ?? await loadClinicDoctorCatalogText(tenantId);

  const prompt = buildOrderEmailExtractUserPrompt({
    fromAddress: primaryFromAddress,
    catalogText: finalCatalogText,
    attachmentsText,
    emailsText,
    preResolved,
    historyContext,
  });

  const compositionHints = compositionHintsFromOrderConstructions(order.constructions);
  const suggestedAttachmentIds = groundTruthSuggestedAttachmentIds(order, emailAttachments);

  const completion = {
    patientName: order.patientName ?? null,
    clinicId: order.clinicId ?? null,
    doctorId: order.doctorId ?? null,
    clientOrderText: order.clientOrderText ?? null,
    patientAppointmentAt: order.dueToAdminsAt?.toISOString() ?? null,
    urgent: order.isUrgent ?? null,
    hasScans: order.hasScans ?? null,
    hasCt: order.hasCt ?? null,
    hasMri: order.hasMri ?? null,
    hasPhoto: order.hasPhoto ?? null,
    suggestedAttachmentIds,
    compositionHints,
    confidenceScore: 100,
    matchedBySourceEmail: sourceMatch.matched,
    sourceEmailAmbiguous: sourceMatch.ambiguous,
    warnings: [],
    groundTruth: {
      workReceivedAt: order.workReceivedAt?.toISOString() ?? null,
      dueDate: order.dueDate?.toISOString() ?? null,
      dueToAdminsAt: order.dueToAdminsAt?.toISOString() ?? null,
      legalEntity: order.legalEntity ?? null,
      payment: order.payment ?? null,
      constructions: order.constructions.map((c) => ({
        code: c.priceListItem?.code ?? null,
        name: c.priceListItem?.name ?? null,
        quantity: c.quantity,
        teethFdi: Array.isArray(c.teethFdi)
          ? c.teethFdi.map((t) => String(t))
          : c.teethFdi == null
            ? []
            : [String(c.teethFdi)],
      })),
    },
  };

  return JSON.stringify({
    messages: [
      { role: "user", content: prompt },
      { role: "assistant", content: JSON.stringify(completion) },
    ],
  });
}
