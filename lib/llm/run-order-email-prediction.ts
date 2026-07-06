import "server-only";
import type { PrismaClient } from "@prisma/client";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";
import { fetchOrderSourceEmails } from "@/lib/mail/order-source-emails";
import { mailHtmlToText, cleanMailTextBody } from "@/lib/mail/mail-text-cleanup";
import {
  extractOrderFieldsFromEmail,
  extractPatientNameOnly,
  mergeAiPredictionJson,
  type EmailAttachmentCatalogItem,
  type EmailBlockForExtract,
} from "./order-email-extract";
import { enrichOrderEmailPrediction } from "./order-email-enrichment";
import { resolveClientIdsFromPrediction } from "@/lib/ai-order-draft-from-prediction";
import { ORDER_CLINIC_PRIVATE } from "@/lib/clients-order-ui";

import { fetchClientOrderHistoryContext } from "./client-history-context";
import { loadActivePriceListItemNames } from "./resolve-ai-composition-lines";
import {
  splitSubjectWorkAndPatient,
  stripWorkNamesFromPatientName,
} from "./order-email-subject-parse";

export type RunOrderEmailPredictionResult = {
  model: string;
  durationMs: number;
  error?: string;
  predictionJson: Record<string, unknown>;
};

function emailBodyText(input: {
  textBody: string | null;
  htmlBody?: string | null;
  preview?: string | null;
}): string {
  return (
    cleanMailTextBody(input.textBody) ||
    (input.htmlBody ? mailHtmlToText(input.htmlBody) : "") ||
    cleanMailTextBody(input.preview) ||
    ""
  );
}

export async function runOrderEmailPrediction(
  db: PrismaClient,
  tenantId: string,
  emailId: string,
  orderId?: string | null,
): Promise<RunOrderEmailPredictionResult | null> {
  const primaryEmail = await db.email.findUnique({
    where: { id: emailId },
    select: {
      subject: true,
      textBody: true,
      htmlBody: true,
      preview: true,
      fromAddress: true,
      attachments: {
        select: { id: true, fileName: true, mimeType: true, size: true },
      },
    },
  });
  if (!primaryEmail) return null;

  const primaryBody = emailBodyText(primaryEmail);
  if (!primaryBody.trim()) return null;

  const emailBlocks: EmailBlockForExtract[] = [];
  const attachmentMap = new Map<string, EmailAttachmentCatalogItem>();

  const addAttachments = (
    rows: Array<{ id: string; fileName: string; mimeType: string; size: number }>,
  ) => {
    for (const a of rows) {
      attachmentMap.set(a.id, {
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
      });
    }
  };

  addAttachments(primaryEmail.attachments);

  if (orderId) {
    const sourceRows = await fetchOrderSourceEmails(db, tenantId, orderId);
    for (const row of sourceRows) {
      const body = row.textBody?.trim() || "";
      if (!body) continue;
      emailBlocks.push({
        id: row.id,
        subject: row.subject,
        textBody: body,
        isPrimary: row.id === emailId,
      });
      for (const a of row.attachments) {
        attachmentMap.set(a.id, a);
      }
    }
  }

  if (emailBlocks.length === 0) {
    emailBlocks.push({
      id: emailId,
      subject: primaryEmail.subject,
      textBody: primaryBody,
      isPrimary: true,
    });
  } else if (!emailBlocks.some((b) => b.isPrimary)) {
    const idx = emailBlocks.findIndex((b) => b.id === emailId);
    if (idx >= 0) emailBlocks[idx].isPrimary = true;
    else {
      emailBlocks.unshift({
        id: emailId,
        subject: primaryEmail.subject,
        textBody: primaryBody,
        isPrimary: true,
      });
    }
  }

  const emailAttachments = [...attachmentMap.values()];

  const sourceMatch = await resolveClientIdsFromOrderSourceEmail(
    db,
    tenantId,
    primaryEmail.fromAddress,
    { preferOrderId: orderId ?? null },
  );

  const preResolved =
    sourceMatch.matched && sourceMatch.doctorId
      ? { clinicId: sourceMatch.clinicId, doctorId: sourceMatch.doctorId }
      : null;

  // ШАГ 1: Имя пациента — сначала из темы (работа + пациент), иначе быстрый LLM
  const priceListNames = await loadActivePriceListItemNames();
  const primaryBlock = emailBlocks.find((b) => b.isPrimary) ?? emailBlocks[0];
  const subjectSplit = splitSubjectWorkAndPatient(primaryBlock?.subject, priceListNames);

  let patientName = subjectSplit.patientName;
  if (!patientName) {
    const extracted = await extractPatientNameOnly(tenantId, emailBlocks);
    patientName =
      stripWorkNamesFromPatientName(extracted.patientName, priceListNames) ??
      extracted.patientName;
  }

  // СБОР КОНТЕКСТА: История врача и пациента
  const historyContext = await fetchClientOrderHistoryContext(
    db,
    tenantId,
    preResolved?.doctorId ?? null,
    patientName,
  );

  // ШАГ 2: Полный разбор с учетом истории
  const { result, model, durationMs, error, rawJson } = await extractOrderFieldsFromEmail(
    tenantId,
    emailBlocks,
    {
      fromAddress: primaryEmail.fromAddress,
      emailAttachments,
      preResolved,
      historyContext,
    },
  );

  let parsedAi: Record<string, unknown> = {};
  if (rawJson) {
    try {
      parsedAi = JSON.parse(rawJson) as Record<string, unknown>;
    } catch {
      parsedAi = (result as Record<string, unknown> | null) ?? {};
    }
  } else if (result) {
    parsedAi = { ...result };
  }

  let predictionJson = mergeAiPredictionJson(parsedAi, {
    preResolved,
    matchedBySourceEmail: sourceMatch.matched,
    sourceEmailAmbiguous: sourceMatch.ambiguous,
  });

  const effectiveSourceMatch = sourceMatch.matched
    ? { clinicId: sourceMatch.clinicId, doctorId: sourceMatch.doctorId, matched: true }
    : undefined;

  const resolvedIds = resolveClientIdsFromPrediction(
    predictionJson as Parameters<typeof resolveClientIdsFromPrediction>[0],
    effectiveSourceMatch,
  );

  predictionJson = await enrichOrderEmailPrediction(db, tenantId, {
    orderId: orderId ?? null,
    primaryEmailId: emailId,
    ai: predictionJson,
    attachments: emailAttachments,
    resolvedClinicId: resolvedIds.clinicId || ORDER_CLINIC_PRIVATE,
    resolvedDoctorId: resolvedIds.doctorId,
  });

  return { model, durationMs, error, predictionJson };
}
