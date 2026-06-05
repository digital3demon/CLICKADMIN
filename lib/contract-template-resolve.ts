import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { CONTRACT_PDF_TEMPLATE_REL } from "@/lib/clinic-contract-pdf";

const DEFAULT_DOCX_REL = "data/templates/typical-contract-ooo.docx";

export type TenantContractTemplates = {
  pdf: Buffer | null;
  pdfFileName: string;
  docx: Buffer | null;
  docxFileName: string | null;
};

export async function loadDefaultContractPdfTemplate(): Promise<Buffer> {
  const abs = path.join(process.cwd(), CONTRACT_PDF_TEMPLATE_REL);
  return fs.readFile(abs);
}

export async function loadDefaultContractDocxTemplate(): Promise<Buffer | null> {
  const abs = path.join(process.cwd(), DEFAULT_DOCX_REL);
  try {
    return await fs.readFile(abs);
  } catch {
    return null;
  }
}

export async function resolveTenantContractTemplates(
  prisma: PrismaClient,
  tenantId: string,
): Promise<TenantContractTemplates> {
  const row = await prisma.contractTemplateSettings.findUnique({
    where: { id: tenantId },
    select: {
      pdfBytes: true,
      pdfFileName: true,
      docxBytes: true,
      docxFileName: true,
      fileName: true,
      mimeType: true,
    },
  });

  let pdf: Buffer | null = null;
  let pdfFileName = "typical-contract-ooo.pdf";
  if (row?.pdfBytes && row.pdfBytes.length > 0) {
    pdf = Buffer.from(row.pdfBytes);
    pdfFileName = row.pdfFileName?.trim() || pdfFileName;
  } else {
    try {
      pdf = await loadDefaultContractPdfTemplate();
    } catch {
      pdf = null;
    }
  }

  let docx: Buffer | null = null;
  let docxFileName: string | null = null;
  if (row?.docxBytes && row.docxBytes.length > 0) {
    docx = Buffer.from(row.docxBytes);
    docxFileName =
      row.docxFileName?.trim() ||
      (row.mimeType?.includes("word") ? row.fileName : null) ||
      "contract-template.docx";
  }

  return { pdf, pdfFileName, docx, docxFileName };
}
