import "server-only";
import type { PrismaClient } from "@prisma/client";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { ORDER_CLINIC_PRIVATE } from "@/lib/clients-order-ui";
import { emailEffectiveReceivedAt } from "@/lib/mail/order-source-work-received";
import { normalizeClientOrderText } from "@/lib/order-email-client-text";
import { deriveSourceDataFlagsFromAttachments } from "@/lib/order-email-attachment-heuristics";
import { parseOptionalIsoDate, parseFirstDateFromText } from "@/lib/order-email-date-parse";
import { resolveClientBillingForOrder } from "@/lib/order-client-billing-for-order";
import { getLabDueSettingsForTenant } from "@/lib/get-lab-due-hm-slots-for-tenant";
import { autoLabDueLocalFromLeadWorkingDays } from "@/lib/order-due-datetime";
import { isoToDatetimeLocal, localDateTimeToIso } from "@/lib/datetime-local";
import {
  resolveAiCompositionLines,
  compositionLinesToOrderConstructions,
  type CompositionHint,
} from "./resolve-ai-composition-lines";
import type { EmailAttachmentCatalogItem } from "./order-email-extract";
import { ORDER_EMAIL_ENRICHMENT_VERSION } from "./order-email-enrichment-version";
import { cleanMailTextBody, mailHtmlToText } from "@/lib/mail/mail-text-cleanup";

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
        ? r.teethFdi.filter((t): t is string => typeof t === "string")
        : null,
    });
  }
  return out;
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
      receivedAt: true,
      sentAt: true,
      createdAt: true,
      textBody: true,
      htmlBody: true,
      preview: true,
    },
  });
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

  const suggestedIds = asStringArray(out.suggestedAttachmentIds);
  const flags = deriveSourceDataFlagsFromAttachments(input.attachments, suggestedIds, {
    hasScans: out.hasScans === true,
    hasCt: out.hasCt === true,
    hasMri: out.hasMri === true,
    hasPhoto: out.hasPhoto === true,
  });
  out.hasScans = flags.hasScans;
  out.hasCt = flags.hasCt;
  out.hasMri = flags.hasMri;
  out.hasPhoto = flags.hasPhoto;

  let appointmentIso = parseOptionalIsoDate(out.patientAppointmentAt);
  if (!appointmentIso && typeof out.patientAppointmentAt === "string") {
    const parsed = parseFirstDateFromText(out.patientAppointmentAt);
    appointmentIso = parsed.iso;
    if (parsed.ambiguous) {
      warnings.push("Несколько дат записи/доставки — выбрана первая");
    }
  }
  if (appointmentIso) {
    out.patientAppointmentAt = appointmentIso;
    out.dueToAdminsAt = appointmentIso;
  }

  const composition = await resolveAiCompositionLines(
    parseCompositionHints(out.compositionHints),
    { clinicId: clinicIdForDb, doctorId: doctorId || null },
  );
  warnings.push(...composition.warnings);
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

  out.warnings = [...new Set(warnings)];
  out.enrichmentVersion = ORDER_EMAIL_ENRICHMENT_VERSION;
  return out;
}
