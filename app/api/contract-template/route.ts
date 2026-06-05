import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { extractContractTemplatePlaceholders } from "@/lib/clinic-contract";
import {
  buildContractPlaceholderListFromPdf,
  extractContractPdfFormFields,
} from "@/lib/clinic-contract-pdf";
import { loadDefaultContractPdfTemplate } from "@/lib/contract-template-resolve";
import { getPrisma } from "@/lib/get-prisma";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
const MAX_TEMPLATE_SIZE_BYTES = 15 * 1024 * 1024;

function toDbBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const start = buf.byteOffset;
  const end = start + buf.byteLength;
  const ab = buf.buffer.slice(start, end) as ArrayBuffer;
  return new Uint8Array(ab);
}

function mergePlaceholderLabels(pdfLabels: string[], docxLabels: string[]): string[] {
  const seen = new Map<string, string>();
  for (const label of [...pdfLabels, ...docxLabels]) {
    const t = label.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (!seen.has(key)) seen.set(key, t);
  }
  return [...seen.values()];
}

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(session);
    const prisma = await getPrisma();
    const row = await prisma.contractTemplateSettings.findUnique({
      where: { id: tenantId },
      select: {
        pdfFileName: true,
        pdfBytes: true,
        docxFileName: true,
        docxBytes: true,
        fileName: true,
        mimeType: true,
        placeholders: true,
        updatedAt: true,
      },
    });
    if (!row) {
      return NextResponse.json({
        hasTemplate: false,
        hasPdf: false,
        hasDocx: false,
        placeholders: [],
      });
    }
    const hasPdf = Boolean(row.pdfBytes && row.pdfBytes.length > 0);
    const hasDocx = Boolean(row.docxBytes && row.docxBytes.length > 0);
    const placeholders = Array.isArray(row.placeholders)
      ? row.placeholders.map((x) => String(x ?? "")).filter((x) => x.trim().length > 0)
      : [];
    return NextResponse.json({
      hasTemplate: hasPdf || hasDocx,
      hasPdf,
      hasDocx,
      pdfFileName: row.pdfFileName ?? (hasPdf ? "typical-contract-ooo.pdf" : null),
      docxFileName:
        row.docxFileName ??
        (hasDocx ? row.fileName ?? "typical-contract-ooo.docx" : null),
      placeholders,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error("[contract-template] GET", e);
    return NextResponse.json(
      { error: "Не удалось загрузить шаблон договора" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(session);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Ожидается multipart/form-data" },
        { status: 400 },
      );
    }

    const pdfFile = form.get("pdf");
    const docxFile = form.get("docx");
    const legacyFile = form.get("file");

    let pdfBuf: Buffer | null = null;
    let pdfName = "typical-contract-ooo.pdf";
    let docxBuf: Buffer | null = null;
    let docxName: string | null = null;

    const readFile = async (file: File) => {
      if (file.size <= 0 || file.size > MAX_TEMPLATE_SIZE_BYTES) {
        const err = new Error("SIZE");
        throw err;
      }
      return Buffer.from(await file.arrayBuffer());
    };

    try {
      if (pdfFile instanceof File) {
        if (!/\.pdf$/i.test(pdfFile.name) && pdfFile.type !== PDF_MIME) {
          return NextResponse.json({ error: "Нужен файл .pdf" }, { status: 400 });
        }
        pdfBuf = await readFile(pdfFile);
        pdfName = pdfFile.name.trim() || pdfName;
      }

      if (docxFile instanceof File) {
        if (!/\.docx$/i.test(docxFile.name)) {
          return NextResponse.json({ error: "DOCX: нужно расширение .docx" }, { status: 400 });
        }
        docxBuf = await readFile(docxFile);
        docxName = docxFile.name.trim() || "contract-template.docx";
      }

      if (legacyFile instanceof File && !pdfBuf && !docxBuf) {
        if (/\.docx$/i.test(legacyFile.name)) {
          docxBuf = await readFile(legacyFile);
          docxName = legacyFile.name.trim() || "contract-template.docx";
        } else if (/\.pdf$/i.test(legacyFile.name)) {
          pdfBuf = await readFile(legacyFile);
          pdfName = legacyFile.name.trim() || pdfName;
        } else {
          return NextResponse.json(
            { error: "Загрузите .pdf (обязательно) или .docx" },
            { status: 400 },
          );
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message === "SIZE") {
        return NextResponse.json(
          { error: "Размер файла должен быть от 1 байта до 15 МБ" },
          { status: 400 },
        );
      }
      throw e;
    }

    if (!pdfBuf && !docxBuf) {
      return NextResponse.json(
        { error: "Укажите PDF-шаблон (поле pdf) и при необходимости DOCX (поле docx)" },
        { status: 400 },
      );
    }

    if (!pdfBuf) {
      try {
        pdfBuf = await loadDefaultContractPdfTemplate();
      } catch {
        return NextResponse.json(
          { error: "Нет PDF-шаблона: загрузите .pdf или добавьте typical-contract-ooo.pdf в data/templates/" },
          { status: 400 },
        );
      }
    }

    const pdfFieldNames = await extractContractPdfFormFields(pdfBuf);
    const pdfLabels = await buildContractPlaceholderListFromPdf(pdfBuf);
    const docxLabels = docxBuf
      ? await extractContractTemplatePlaceholders(docxBuf)
      : [];
    const placeholders = mergePlaceholderLabels(
      pdfLabels.length > 0 ? pdfLabels : pdfFieldNames,
      docxLabels,
    );

    const prisma = await getPrisma();
    await prisma.contractTemplateSettings.upsert({
      where: { id: tenantId },
      create: {
        id: tenantId,
        pdfFileName: pdfName,
        pdfBytes: toDbBytes(pdfBuf),
        docxFileName: docxName,
        docxBytes: docxBuf ? toDbBytes(docxBuf) : null,
        fileName: docxName ?? pdfName,
        mimeType: docxBuf ? DOCX_MIME : PDF_MIME,
        placeholders,
      },
      update: {
        pdfFileName: pdfName,
        pdfBytes: toDbBytes(pdfBuf),
        ...(docxBuf
          ? {
              docxFileName: docxName,
              docxBytes: toDbBytes(docxBuf),
              fileName: docxName ?? undefined,
              mimeType: DOCX_MIME,
            }
          : {}),
        placeholders,
      },
    });

    return NextResponse.json({
      ok: true,
      pdfFileName: pdfName,
      docxFileName: docxName,
      placeholders,
    });
  } catch (e) {
    console.error("[contract-template] POST", e);
    return NextResponse.json(
      { error: "Не удалось загрузить шаблон договора" },
      { status: 500 },
    );
  }
}
