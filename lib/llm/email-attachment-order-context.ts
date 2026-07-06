import "server-only";

import type { PrismaClient } from "@prisma/client";
import { readMailAttachmentBytes } from "@/lib/mail/mail-attachment-storage";
import { isProbablyPdf } from "@/lib/invoice-number-extract";
import {
  extractClickOrderPdfForm,
  type ClickOrderPdfExtract,
} from "./click-order-pdf-form";

export type EmailAttachmentRef = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  emailId: string;
};

const MAX_PDF_ATTACHMENTS = 3;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

export type EmailAttachmentOrderContext = {
  clickOrderPdfs: ClickOrderPdfExtract[];
  promptBlock: string;
  primaryPatientName: string | null;
  suggestedAttachmentIds: string[];
};

function mergeClickOrderContexts(items: ClickOrderPdfExtract[]): EmailAttachmentOrderContext {
  const blocks = items.map((item) => item.promptBlock).filter(Boolean);
  const primaryPatientName =
    items.find((item) => item.patientName?.trim())?.patientName?.trim() ?? null;
  const suggestedAttachmentIds = items
    .map((item) => item.attachmentId)
    .filter((id): id is string => Boolean(id));

  return {
    clickOrderPdfs: items,
    promptBlock: blocks.length > 0 ? blocks.join("\n\n---\n\n") : "",
    primaryPatientName,
    suggestedAttachmentIds,
  };
}

export async function loadEmailAttachmentOrderContext(
  db: PrismaClient,
  tenantId: string,
  attachments: EmailAttachmentRef[],
): Promise<EmailAttachmentOrderContext> {
  const pdfRefs = attachments
    .filter((a) => isProbablyPdf(a.mimeType, a.fileName))
    .slice(0, MAX_PDF_ATTACHMENTS);

  if (pdfRefs.length === 0) {
    return mergeClickOrderContexts([]);
  }

  const rows = await db.emailAttachment.findMany({
    where: {
      tenantId,
      id: { in: pdfRefs.map((a) => a.id) },
    },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      emailId: true,
      diskRelPath: true,
      data: true,
    },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  const extracts: ClickOrderPdfExtract[] = [];

  for (const ref of pdfRefs) {
    const row = byId.get(ref.id);
    if (!row) continue;
    try {
      const buf = await readMailAttachmentBytes(row);
      if (buf.length > MAX_PDF_BYTES) continue;
      const extract = await extractClickOrderPdfForm(buf, row.mimeType, row.fileName, {
        attachmentId: row.id,
      });
      if (extract) extracts.push(extract);
    } catch {
      continue;
    }
  }

  return mergeClickOrderContexts(extracts);
}
