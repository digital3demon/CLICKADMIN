import "server-only";
import type { PrismaClient } from "@prisma/client";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { ORDER_CLINIC_PRIVATE } from "@/lib/clients-order-ui";
import { emailEffectiveReceivedAt } from "@/lib/mail/order-source-work-received";
import { normalizeClientOrderText } from "@/lib/order-email-client-text";
import { deriveSourceDataFlagsFromAttachments, collectScanLikeAttachmentIds } from "@/lib/order-email-attachment-heuristics";
import { parseOptionalIsoDate, parseFirstDateFromText, parseAppointmentDateFromOrderEmailText } from "@/lib/order-email-date-parse";
import { resolveClientBillingForOrder } from "@/lib/order-client-billing-for-order";
import { getLabDueSettingsForTenant } from "@/lib/get-lab-due-hm-slots-for-tenant";
import { autoLabDueLocalFromLeadWorkingDays } from "@/lib/order-due-datetime";
import { isoToDatetimeLocal, localDateTimeToIso } from "@/lib/datetime-local";
import {
  resolveAiCompositionLines,
  inferCompositionHintsFromOrderText,
  inferCompositionHintsFromEmailContext,
  compositionLinesToOrderConstructions,
  loadActivePriceListItemNames,
  dedupeCompositionHintsBySpecificity,
  dedupeCompositionHintsBySiblingVariants,
  filterCompositionHintsByNegation,
  filterCompositionHintsByOrderTextEvidence,
  hasOrderTextEvidenceForPriceHint,
  type CompositionHint,
} from "./resolve-ai-composition-lines";
import type { EmailAttachmentCatalogItem } from "./order-email-extract";
import { ORDER_EMAIL_ENRICHMENT_VERSION } from "./order-email-enrichment-version";
import { cleanMailTextBody, mailHtmlToText } from "@/lib/mail/mail-text-cleanup";
import {
  splitSubjectWorkAndPatient,
  stripWorkNamesFromPatientName,
} from "./order-email-subject-parse";
import {
  deriveSourceDataFlagsFromEmailText,
  normalizeAwaitingDataFromEmailText,
} from "./order-email-awaiting-data-guard";
import { normalizeWarningsForShipTogetherRequest } from "./order-email-shipment-together-guard";
import { enrichCompositionHintsWithTeethFdi } from "@/lib/order-text-teeth-fdi";

export type EnrichedPrediction = Record<string, unknown>;

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function parseCompositionHints(v: unknown): CompositionHint[] {
  if (!Array.isArray(v)) return [];
  const out: CompositionHint[] = [];
  for (const row of v) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const nameHint = typeof r.nameHint === "string" ? r.nameHint : "";
    if (!nameHint.trim()) continue;
    out.push({
      nameHint,
      quantity: typeof r.quantity === "number" ? r.quantity : null,
      teethFdi: Array.isArray(r.teethFdi)
        ? r.teethFdi
            .map((t) =>
              typeof t === "string" || typeof t === "number" ? String(t).trim() : "",
            )
            .filter(Boolean)
        : null,
    });
  }
  return out;
}

function filterMisleadingAiWarnings(
  warnings: string[],
  opts: {
    clientMatchedByEmail: boolean;
    patientFixedFromSubject: boolean;
    attachmentFileNames?: string[];
  },
): string[] {
  const catalogNames = (opts.attachmentFileNames ?? []).map((name) => name.toLowerCase());

  return warnings.filter((w) => {
    const lower = w.toLowerCase();
    if (opts.clientMatchedByEmail) {
      if (lower.includes("не определен врач") && lower.includes("из темы")) return false;
      if (lower.includes("не определена клиника") && lower.includes("отправител")) return false;
    }
    if (opts.patientFixedFromSubject && lower.includes("неясное фио пациента")) return false;

    const missingAttachment = w.match(
      /вложение\s+(\S+)\s+упомянуто[^.]*отсутствует\s+в\s+каталоге/i,
    );
    if (missingAttachment && catalogNames.length > 0) {
      const mentioned = missingAttachment[1]!.toLowerCase();
      const found = catalogNames.some(
        (fileName) =>
          fileName === mentioned ||
          fileName.includes(mentioned) ||
          mentioned.includes(fileName),
      );
      if (found) return false;
    }

    return true;
  });
}

function mergeCompositionHints(
  existing: CompositionHint[],
  extraNameHints: string[],
): CompositionHint[] {
  if (extraNameHints.length === 0) return existing;
  const merged = [...existing];
  const known = new Set(existing.map((h) => h.nameHint.trim().toLowerCase()));
  for (const nameHint of extraNameHints) {
    const key = nameHint.trim().toLowerCase();
    if (!key || known.has(key)) continue;
    known.add(key);
    merged.push({ nameHint, quantity: 1 });
  }
  return merged;
}

function mergeCompositionHintObjects(
  existing: CompositionHint[],
  extra: CompositionHint[],
): CompositionHint[] {
  if (extra.length === 0) return existing;
  const merged = [...existing];
  const known = new Set(existing.map((h) => h.nameHint.trim().toLowerCase()));
  for (const hint of extra) {
    const key = hint.nameHint.trim().toLowerCase();
    if (!key || known.has(key)) continue;
    known.add(key);
    merged.push(hint);
  }
  return merged;
}

function mergeAiAndInferredCompositionHints(
  aiHints: CompositionHint[],
  inferredHints: CompositionHint[],
  orderText: string,
): CompositionHint[] {
  if (aiHints.length === 0) return inferredHints;
  if (inferredHints.length === 0) {
    return filterCompositionHintsByOrderTextEvidence(aiHints, orderText);
  }

  const inferredKeys = new Set(
    inferredHints.map((hint) => hint.nameHint.trim().toLowerCase()).filter(Boolean),
  );
  const filteredAi = aiHints.filter((hint) => {
    const key = hint.nameHint.trim().toLowerCase();
    if (inferredKeys.has(key)) return true;
    return hasOrderTextEvidenceForPriceHint(hint.nameHint, orderText);
  });
  return mergeCompositionHintObjects(filteredAi, inferredHints);
}

export async function enrichOrderEmailPrediction(
  db: PrismaClient,
  tenantId: string,
  input: {
    orderId?: string | null;
    primaryEmailId: string;
    ai: Record<string, unknown>;
    attachments: EmailAttachmentCatalogItem[];
    resolvedClinicId: string;
    resolvedDoctorId: string;
  },
): Promise<EnrichedPrediction> {
  const out: EnrichedPrediction = { ...input.ai };
  const warnings = [...asStringArray(out.warnings).map(String)];

  const clientsPrisma = await getClientsPrisma();
  const clinicIdForDb =
    input.resolvedClinicId === ORDER_CLINIC_PRIVATE ||
    !input.resolvedClinicId.trim()
      ? null
      : input.resolvedClinicId.trim();
  const doctorId = input.resolvedDoctorId.trim();

  const billing = await resolveClientBillingForOrder(
    clientsPrisma,
    tenantId,
    clinicIdForDb,
    doctorId || null,
  );
  out.legalEntity = billing.legalEntity;
  out.payment = billing.payment;

  const primaryEmail = await db.email.findUnique({
    where: { id: input.primaryEmailId },
    select: {
      fromAddress: true,
      subject: true,
      receivedAt: true,
      sentAt: true,
      createdAt: true,
      textBody: true,
      htmlBody: true,
      preview: true,
    },
  });

  const sourceMatch = primaryEmail?.fromAddress
    ? await resolveClientIdsFromOrderSourceEmail(db, tenantId, primaryEmail.fromAddress, {
        preferOrderId: input.orderId ?? null,
      })
    : { clinicId: null, doctorId: null, matched: false, ambiguous: false };
  out.matchedBySourceEmail = sourceMatch.matched;
  if (sourceMatch.ambiguous) {
    out.sourceEmailAmbiguous = true;
  } else {
    delete out.sourceEmailAmbiguous;
  }
  if (sourceMatch.matched && sourceMatch.doctorId) {
    out.clinicId = sourceMatch.clinicId;
    out.doctorId = sourceMatch.doctorId;
  }

  const rawClinicId =
    typeof out.clinicId === "string" && out.clinicId.trim() ? out.clinicId.trim() : null;
  const clinicIdForName =
    rawClinicId && rawClinicId !== ORDER_CLINIC_PRIVATE ? rawClinicId : null;
  const doctorIdForName =
    typeof out.doctorId === "string" && out.doctorId.trim() ? out.doctorId.trim() : null;

  if (doctorIdForName) {
    const doctor = await clientsPrisma.doctor.findFirst({
      where: { id: doctorIdForName, tenantId, deletedAt: null },
      select: { fullName: true },
    });
    if (doctor?.fullName.trim()) {
      out.resolvedDoctorName = doctor.fullName.trim();
    }
  }

  if (clinicIdForName) {
    const clinic = await clientsPrisma.clinic.findFirst({
      where: { id: clinicIdForName, tenantId, deletedAt: null },
      select: { name: true },
    });
    if (clinic?.name.trim()) {
      out.resolvedClinicName = clinic.name.trim();
    }
  } else if (
    out.clinicId === null ||
    rawClinicId === ORDER_CLINIC_PRIVATE ||
    out.clinicId === ORDER_CLINIC_PRIVATE
  ) {
    out.resolvedClinicName = "Частная практика";
  }

  let workReceivedAt: Date | null = primaryEmail
    ? emailEffectiveReceivedAt(primaryEmail)
    : null;

  if (input.orderId) {
    const links = await db.emailSourceOrder.findMany({
      where: { tenantId, orderId: input.orderId },
      select: {
        email: { select: { receivedAt: true, sentAt: true, createdAt: true } },
      },
    });
    for (const link of links) {
      const at = emailEffectiveReceivedAt(link.email);
      if (!at) continue;
      if (!workReceivedAt || at.getTime() < workReceivedAt.getTime()) {
        workReceivedAt = at;
      }
    }
  }

  if (workReceivedAt) {
    out.workReceivedAt = workReceivedAt.toISOString();
  }

  let rawClientText =
    (typeof out.clientOrderText === "string" && out.clientOrderText.trim()
      ? out.clientOrderText
      : typeof out.workDescription === "string"
        ? out.workDescription
        : "") || "";

  if (!rawClientText.trim() && primaryEmail) {
    rawClientText =
      cleanMailTextBody(primaryEmail.textBody) ||
      (primaryEmail.htmlBody ? mailHtmlToText(primaryEmail.htmlBody) : "") ||
      cleanMailTextBody(primaryEmail.preview) ||
      "";
  }
  out.clientOrderText = normalizeClientOrderText(rawClientText);

  const emailBodyForGuards =
    rawClientText.trim() ||
    (primaryEmail
      ? cleanMailTextBody(primaryEmail.textBody) ||
        (primaryEmail.htmlBody ? mailHtmlToText(primaryEmail.htmlBody) : "") ||
        cleanMailTextBody(primaryEmail.preview) ||
        ""
      : "");

  out.awaitingData = normalizeAwaitingDataFromEmailText(
    out.awaitingData as Parameters<typeof normalizeAwaitingDataFromEmailText>[0],
    emailBodyForGuards,
  );

  const suggestedIds = asStringArray(out.suggestedAttachmentIds);
  const flagsFromAttachments = deriveSourceDataFlagsFromAttachments(input.attachments, suggestedIds, {
    hasScans: out.hasScans === true,
    hasCt: out.hasCt === true,
    hasMri: out.hasMri === true,
    hasPhoto: out.hasPhoto === true,
  });
  const flags = deriveSourceDataFlagsFromEmailText(emailBodyForGuards, flagsFromAttachments);
  out.hasScans = flags.hasScans;
  out.hasCt = flags.hasCt;
  out.hasMri = flags.hasMri;
  out.hasPhoto = flags.hasPhoto;

  const scanAttachmentIds = collectScanLikeAttachmentIds(input.attachments);
  const mergedSuggestedIds = [...new Set([...suggestedIds, ...scanAttachmentIds])];
  if (mergedSuggestedIds.length > 0) {
    out.suggestedAttachmentIds = mergedSuggestedIds;
  }

  let appointmentIso = parseOptionalIsoDate(out.patientAppointmentAt);
  if (!appointmentIso && typeof out.patientAppointmentAt === "string") {
    const parsed = parseFirstDateFromText(out.patientAppointmentAt);
    appointmentIso = parsed.iso;
    if (parsed.ambiguous) {
      warnings.push("Несколько дат записи/доставки — выбрана первая");
    }
  }
  if (!appointmentIso) {
    const dateSource = [rawClientText, emailBodyForGuards]
      .map((part) => part?.trim() ?? "")
      .filter(Boolean)
      .join("\n");
    const fromOrderText = parseAppointmentDateFromOrderEmailText(dateSource);
    appointmentIso = fromOrderText.iso;
    if (fromOrderText.ambiguous) {
      warnings.push("Несколько дат записи/доставки — выбрана первая");
    }
  }
  if (appointmentIso) {
    out.patientAppointmentAt = appointmentIso;
    out.dueToAdminsAt = appointmentIso;
  }

  const priceListNames = await loadActivePriceListItemNames();
  const subjectSplit = splitSubjectWorkAndPatient(primaryEmail?.subject, priceListNames);
  let patientFixedFromSubject = false;

  if (subjectSplit.patientName) {
    out.patientName = subjectSplit.patientName;
    patientFixedFromSubject = true;
  } else if (typeof out.patientName === "string") {
    const cleaned = stripWorkNamesFromPatientName(out.patientName, priceListNames);
    if (cleaned && cleaned !== out.patientName.trim()) {
      out.patientName = cleaned;
      patientFixedFromSubject = true;
    }
  }

  const aiCompositionHints = mergeCompositionHints(
    parseCompositionHints(out.compositionHints),
    subjectSplit.workNameHints,
  );
  const clientText = typeof out.clientOrderText === "string" ? out.clientOrderText : "";
  const pdfOrderText =
    typeof out.clickOrderPdfContext === "string" ? out.clickOrderPdfContext : null;
  const negationOrderText = [clientText, pdfOrderText, primaryEmail?.subject ?? ""]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
  const inferredHints = inferCompositionHintsFromEmailContext(
    {
      clientOrderText: clientText,
      emailSubject: primaryEmail?.subject ?? null,
      pdfOrderText,
    },
    priceListNames,
  );
  let compositionHints = filterCompositionHintsByNegation(
    dedupeCompositionHintsBySiblingVariants(
      dedupeCompositionHintsBySpecificity(
        aiCompositionHints.length === 0
          ? inferredHints
          : mergeAiAndInferredCompositionHints(
              aiCompositionHints,
              inferredHints,
              negationOrderText,
            ),
      ),
      negationOrderText,
    ),
    negationOrderText,
  );

  compositionHints = enrichCompositionHintsWithTeethFdi(compositionHints, negationOrderText);

  let composition = await resolveAiCompositionLines(compositionHints, {
    clinicId: clinicIdForDb,
    doctorId: doctorId || null,
    negationOrderText,
  });
  let compositionWarnings = composition.warnings;

  if (inferredHints.length > 0 && aiCompositionHints.length > 0) {
    const [aiOnly, inferredOnly] = await Promise.all([
      resolveAiCompositionLines(aiCompositionHints, {
        clinicId: clinicIdForDb,
        doctorId: doctorId || null,
        negationOrderText,
      }),
      resolveAiCompositionLines(inferredHints, {
        clinicId: clinicIdForDb,
        doctorId: doctorId || null,
        negationOrderText,
      }),
    ]);
    if (aiOnly.lines.length === 0 && inferredOnly.lines.length > 0) {
      composition = inferredOnly;
      compositionHints = inferredHints;
      compositionWarnings = inferredOnly.warnings;
    }
  } else if (composition.lines.length === 0 && inferredHints.length > 0) {
    const retry = await resolveAiCompositionLines(inferredHints, {
      clinicId: clinicIdForDb,
      doctorId: doctorId || null,
      negationOrderText,
    });
    if (retry.lines.length > 0) {
      composition = retry;
      compositionHints = inferredHints;
      compositionWarnings = retry.warnings;
    }
  }

  out.compositionHints = compositionHints;
  warnings.push(...compositionWarnings);
  out.resolvedConstructions = compositionLinesToOrderConstructions(composition.lines);
  out.compositionLineCount = composition.lines.length;

  const { slots, country } = await getLabDueSettingsForTenant(tenantId);
  if (workReceivedAt && composition.maxLeadWorkingDays >= 0) {
    const baseLocal = isoToDatetimeLocal(workReceivedAt.toISOString());
    const labDueLocal = autoLabDueLocalFromLeadWorkingDays({
      baseLocal,
      leadWorkingDays: composition.maxLeadWorkingDays,
      slotsHm: slots,
      country,
    });
    if (labDueLocal) {
      const labDueIso = localDateTimeToIso(labDueLocal);
      if (labDueIso) {
        out.dueDate = labDueIso;
        if (appointmentIso) {
          const labMs = new Date(labDueIso).getTime();
          const apptMs = new Date(appointmentIso).getTime();
          if (apptMs < labMs) {
            warnings.push(
              "Клиент просит выдачу раньше расчётного срока лаборатории по прайсу",
            );
          }
        }
      }
    }
  }

  const shipTogether = normalizeWarningsForShipTogetherRequest(
    warnings,
    emailBodyForGuards,
    typeof out.patientName === "string" ? out.patientName : null,
  );
  if (shipTogether.shipTogetherRequest) {
    out.shipTogetherRequest = shipTogether.shipTogetherRequest;
  } else {
    delete out.shipTogetherRequest;
  }

  out.warnings = [
    ...new Set(
      filterMisleadingAiWarnings(shipTogether.warnings, {
        clientMatchedByEmail: out.matchedBySourceEmail === true,
        patientFixedFromSubject,
        attachmentFileNames: input.attachments.map((a) => a.fileName),
      }),
    ),
  ];
  out.enrichmentVersion = ORDER_EMAIL_ENRICHMENT_VERSION;
  return out;
}
