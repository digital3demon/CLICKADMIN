import "server-only";
import type { PrismaClient } from "@prisma/client";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";
import {
  extractOrderFieldsFromEmail,
  mergeAiPredictionJson,
  type EmailAttachmentCatalogItem,
} from "./order-email-extract";
import { mailHtmlToText, cleanMailTextBody } from "@/lib/mail/mail-text-cleanup";

export type RunOrderEmailPredictionResult = {
  model: string;
  durationMs: number;
  error?: string;
  predictionJson: Record<string, unknown>;
};

export async function runOrderEmailPrediction(
  db: PrismaClient,
  tenantId: string,
  emailId: string,
): Promise<RunOrderEmailPredictionResult | null> {
  const email = await db.email.findUnique({
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
  if (!email) return null;

  const subject = email.subject || "(без темы)";
  const textBody =
    cleanMailTextBody(email.textBody) ||
    mailHtmlToText(email.htmlBody) ||
    cleanMailTextBody(email.preview) ||
    "";
  if (!textBody.trim()) return null;

  const emailAttachments: EmailAttachmentCatalogItem[] = email.attachments.map((a) => ({
    id: a.id,
    fileName: a.fileName,
    mimeType: a.mimeType,
    size: a.size,
  }));

  const sourceMatch = await resolveClientIdsFromOrderSourceEmail(
    db,
    tenantId,
    email.fromAddress,
  );

  const preResolved =
    sourceMatch.matched && sourceMatch.doctorId
      ? { clinicId: sourceMatch.clinicId, doctorId: sourceMatch.doctorId }
      : null;

  const { result, model, durationMs, error, rawJson } = await extractOrderFieldsFromEmail(
    tenantId,
    subject,
    textBody,
    {
      fromAddress: email.fromAddress,
      emailAttachments,
      preResolved,
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

  const predictionJson = mergeAiPredictionJson(parsedAi, {
    preResolved,
    matchedBySourceEmail: sourceMatch.matched,
    sourceEmailAmbiguous: sourceMatch.ambiguous,
  });

  return { model, durationMs, error, predictionJson };
}
