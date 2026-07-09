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
import { loadEmailAttachmentOrderContext, type EmailAttachmentOrderContext } from "./email-attachment-order-context";

import { fetchClientOrderHistoryContext } from "./client-history-context";
import { loadActivePriceListItemNames } from "./resolve-ai-composition-lines";
import {
  splitSubjectWorkAndPatient,
  stripWorkNamesFromPatientName,
  parsePatientNameFromEmailBody,
} from "./order-email-subject-parse";
import { parseStructuredClinicEmailBody, buildClientOrderTextFromBody, canUseHeuristicPrefill } from "./order-email-structured-body";
import { loadClinicDoctorCatalog } from "./order-email-extract";
import { resolveClinicId, resolveDoctorId } from "@/lib/order-import-export";

export type RunOrderEmailPredictionResult = {
  model: string;
  durationMs: number;
  error?: string;
  predictionJson: Record<string, unknown>;
};

export type RunOrderEmailPredictionOptions = {
  /** Для резолва врача по истории, без подмешивания писем чужого наряда. */
  preferOrderIdForSource?: string | null;
  /** Черновик наряда до сохранения — полный LLM как в diff viewer. */
  forPrefill?: boolean;
  /** Только эвристика/структурный разбор, без вызова LLM (кнопка «без ИИ-расчёта»). */
  heuristicOnly?: boolean;
};

const MIN_BODY_CHARS_SKIP_PDF = 120;

const EMPTY_ATTACHMENT_CONTEXT: EmailAttachmentOrderContext = {
  clickOrderPdfs: [],
  promptBlock: "",
  primaryPatientName: null,
  suggestedAttachmentIds: [],
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

function mergePdfHintsIntoPrediction(
  prediction: Record<string, unknown>,
  pdf: Awaited<ReturnType<typeof loadEmailAttachmentOrderContext>>,
): Record<string, unknown> {
  if (pdf.clickOrderPdfs.length === 0) return prediction;

  const out = { ...prediction };
  const primary = pdf.clickOrderPdfs[0]!;

  out.clickOrderPdfUsed = true;
  if (pdf.promptBlock.trim()) out.clickOrderPdfContext = pdf.promptBlock.trim();

  if (primary.patientName?.trim() && !String(out.patientName ?? "").trim()) {
    out.patientName = primary.patientName.trim();
  }
  if (primary.clinicName?.trim() && !String(out.clinicHint ?? "").trim()) {
    out.clinicHint = primary.clinicName.trim();
  }
  if (primary.doctorName?.trim() && !String(out.doctorHint ?? "").trim()) {
    out.doctorHint = primary.doctorName.trim();
  }
  if (primary.clientOrderText.trim() && !String(out.clientOrderText ?? "").trim()) {
    out.clientOrderText = primary.clientOrderText.trim();
  }
  if (primary.checkedSources.some((s) => /скан/i.test(s))) {
    out.hasScans = true;
  }

  const existingIds = Array.isArray(out.suggestedAttachmentIds)
    ? out.suggestedAttachmentIds.filter((x): x is string => typeof x === "string")
    : [];
  const mergedIds = [...new Set([...existingIds, ...pdf.suggestedAttachmentIds])];
  if (mergedIds.length > 0) out.suggestedAttachmentIds = mergedIds;

  return out;
}

export async function runOrderEmailPrediction(
  db: PrismaClient,
  tenantId: string,
  emailId: string,
  orderId?: string | null,
  opts?: RunOrderEmailPredictionOptions,
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
  const emailBlocks: EmailBlockForExtract[] = [];
  const attachmentMap = new Map<string, EmailAttachmentCatalogItem>();
  const attachmentRefs: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    emailId: string;
  }> = [];

  const addAttachments = (
    emailIdForAttachment: string,
    rows: Array<{ id: string; fileName: string; mimeType: string; size: number }>,
  ) => {
    for (const a of rows) {
      attachmentMap.set(a.id, {
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
      });
      attachmentRefs.push({ ...a, emailId: emailIdForAttachment });
    }
  };

  addAttachments(emailId, primaryEmail.attachments);

  if (orderId) {
    const sourceRows = await fetchOrderSourceEmails(db, tenantId, orderId);
    for (const row of sourceRows) {
      const body = row.textBody?.trim() || "";
      if (body) {
        emailBlocks.push({
          id: row.id,
          subject: row.subject,
          textBody: body,
          isPrimary: row.id === emailId,
        });
      }
      addAttachments(row.id, row.attachments);
    }
  }

  let pdfContext = EMPTY_ATTACHMENT_CONTEXT;
  if (primaryBody.trim().length < MIN_BODY_CHARS_SKIP_PDF) {
    pdfContext = await loadEmailAttachmentOrderContext(db, tenantId, attachmentRefs);
  }
  const pdfFallbackBody = pdfContext.clickOrderPdfs[0]?.clientOrderText?.trim() ?? "";
  const effectiveBody = primaryBody.trim() || pdfFallbackBody;

  if (!effectiveBody.trim()) return null;

  if (emailBlocks.length === 0) {
    emailBlocks.push({
      id: emailId,
      subject: primaryEmail.subject,
      textBody: effectiveBody,
      isPrimary: true,
    });
  } else if (!emailBlocks.some((b) => b.isPrimary)) {
    const idx = emailBlocks.findIndex((b) => b.id === emailId);
    if (idx >= 0) emailBlocks[idx].isPrimary = true;
    else {
      emailBlocks.unshift({
        id: emailId,
        subject: primaryEmail.subject,
        textBody: effectiveBody,
        isPrimary: true,
      });
    }
  } else if (!primaryBody.trim() && pdfFallbackBody) {
    const primaryBlock = emailBlocks.find((b) => b.isPrimary) ?? emailBlocks[0];
    if (primaryBlock) primaryBlock.textBody = pdfFallbackBody;
  }

  const emailAttachments = [...attachmentMap.values()];

  const sourceMatch = await resolveClientIdsFromOrderSourceEmail(
    db,
    tenantId,
    primaryEmail.fromAddress,
    { preferOrderId: orderId ?? opts?.preferOrderIdForSource ?? null },
  );

  const preResolved =
    sourceMatch.matched && sourceMatch.doctorId
      ? { clinicId: sourceMatch.clinicId, doctorId: sourceMatch.doctorId }
      : null;

  const priceListNames = await loadActivePriceListItemNames();
  const primaryBlock = emailBlocks.find((b) => b.isPrimary) ?? emailBlocks[0];
  const subjectSplit = splitSubjectWorkAndPatient(primaryBlock?.subject, priceListNames);
  const structured = parseStructuredClinicEmailBody(effectiveBody);

  let patientName =
    structured.patientName ??
    subjectSplit.patientName ??
    parsePatientNameFromEmailBody(primaryBody) ??
    pdfContext.primaryPatientName ??
    pdfContext.clickOrderPdfs[0]?.patientName ??
    null;

  const fastPathStart = Date.now();
  let parsedAi: Record<string, unknown> | null = null;
  let model = "structured-fast-path";
  let durationMs = 0;
  let llmError: string | undefined;

  const clientOrderText =
    structured.clientOrderText ?? buildClientOrderTextFromBody(effectiveBody);
  const heuristicGate = canUseHeuristicPrefill({
    patientName,
    doctorHint: structured.doctorHint,
    clinicHint: structured.clinicHint,
    clientOrderText,
    hasResolvedDoctor: Boolean(preResolved?.doctorId),
    hasResolvedClinic: Boolean(preResolved?.clinicId),
  });
  const useFastPath =
    opts?.heuristicOnly === true ||
    (!opts?.forPrefill && orderId == null && heuristicGate);

  if (useFastPath) {
    const workText = clientOrderText?.trim() || effectiveBody.trim();
    if (workText) {
      let clinicId = preResolved?.clinicId ?? null;
      let doctorId = preResolved?.doctorId ?? null;

      const catalog = await loadClinicDoctorCatalog(tenantId);
      if (!doctorId && structured.doctorHint) {
        doctorId = resolveDoctorId(structured.doctorHint, catalog.doctors);
      }
      if (!clinicId && structured.clinicHint) {
        clinicId = resolveClinicId(structured.clinicHint, catalog.clinics);
      }

      const warnings: string[] = [];
      if (!doctorId) {
        warnings.push("Врач не найден в справочнике — выберите вручную в форме");
      }
      if (opts?.heuristicOnly && !heuristicGate) {
        warnings.push("Заполнено без ИИ — проверьте все поля вручную");
      }

      parsedAi = {
        patientName: patientName ?? structured.patientName,
        clinicId,
        doctorId,
        clinicHint: structured.clinicHint,
        doctorHint: structured.doctorHint,
        clientOrderText: clientOrderText ?? workText,
        confidenceScore: doctorId ? 80 : opts?.heuristicOnly ? 50 : 65,
        warnings,
        compositionHints: [],
        suggestedAttachmentIds: [],
        urgent: false,
      };
      durationMs = Date.now() - fastPathStart;
    }
  }

  if (!parsedAi && opts?.heuristicOnly) {
    parsedAi = {
      patientName,
      clinicHint: structured.clinicHint,
      doctorHint: structured.doctorHint,
      clientOrderText: clientOrderText ?? effectiveBody.trim(),
      confidenceScore: 35,
      warnings: ["Заполнено без ИИ — проверьте все поля вручную"],
      compositionHints: [],
      suggestedAttachmentIds: [],
      urgent: false,
    };
    durationMs = Date.now() - fastPathStart;
  }

  if (!parsedAi && !opts?.heuristicOnly) {
    if (!patientName && !opts?.forPrefill) {
      const extracted = await extractPatientNameOnly(tenantId, emailBlocks);
      patientName =
        stripWorkNamesFromPatientName(extracted.patientName, priceListNames) ??
        extracted.patientName;
    }

    const historyContext =
      orderId != null && !opts?.forPrefill
        ? await fetchClientOrderHistoryContext(
            db,
            tenantId,
            preResolved?.doctorId ?? null,
            patientName,
          )
        : null;

    const llmRun = await extractOrderFieldsFromEmail(tenantId, emailBlocks, {
      fromAddress: primaryEmail.fromAddress,
      emailAttachments,
      pdfOrderText: pdfContext.promptBlock,
      preResolved,
      historyContext,
      forPrefill: opts?.forPrefill ?? orderId == null,
      emailBodyForCatalogFilter: effectiveBody,
    });

    model = llmRun.model;
    durationMs = llmRun.durationMs;
    llmError = llmRun.error;

    if (llmRun.rawJson) {
      try {
        parsedAi = JSON.parse(llmRun.rawJson) as Record<string, unknown>;
      } catch {
        parsedAi = (llmRun.result as Record<string, unknown> | null) ?? {};
      }
    } else if (llmRun.result) {
      parsedAi = { ...llmRun.result };
    } else {
      parsedAi = {};
    }
  }

  parsedAi = mergePdfHintsIntoPrediction(parsedAi, pdfContext);

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

  return { model, durationMs, error: llmError, predictionJson };
}
