import { NextResponse } from "next/server";
import {
  buildDraftValues,
  convertDocxToEditableHtml,
  convertEditableHtmlToDocx,
  extractContractNumberFromDocxBuffer,
  formatContractNumber,
  formatYearMonthYYMM,
  generateContractDocxFromTemplate,
  parseGeneratedContractNumber,
  type ClinicContractDraftValues,
} from "@/lib/clinic-contract";
import { getPrisma } from "@/lib/get-prisma";

const MAX_DOCX_SIZE_BYTES = 12 * 1024 * 1024;

type JsonBody =
  | { action: "prefill" }
  | { action: "assemble"; values: ClinicContractDraftValues }
  | {
      action: "save-generated";
      values: ClinicContractDraftValues;
      editedHtml: string;
    };

function asDraftValues(v: unknown): ClinicContractDraftValues | null {
  if (!v || typeof v !== "object") return null;
  const row = v as Record<string, unknown>;
  const out: ClinicContractDraftValues = {
    contractNumber: String(row.contractNumber ?? "").trim(),
    contractDate: String(row.contractDate ?? "").trim(),
    orgShortName: String(row.orgShortName ?? "").trim(),
    inn: String(row.inn ?? "").trim(),
    ceoName: String(row.ceoName ?? "").trim(),
    email: String(row.email ?? "").trim(),
    requisitesLine: String(row.requisitesLine ?? "").trim(),
  };
  if (!out.contractNumber || !out.contractDate || !out.orgShortName) return null;
  return out;
}

function composeAttachmentName(contractNumber: string): string {
  const clean = contractNumber.replace(/[^\w\-./]+/g, "_").slice(0, 60) || "dogovor";
  return `dogovor-${clean}.docx`;
}

function toDbBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const start = buf.byteOffset;
  const end = start + buf.byteLength;
  const ab = buf.buffer.slice(start, end) as ArrayBuffer;
  return new Uint8Array(ab);
}

async function syncContractSequenceIfNeeded(
  tenantId: string,
  contractNumber: string,
): Promise<void> {
  const parsed = parseGeneratedContractNumber(contractNumber);
  if (!parsed) return;
  const prisma = await getPrisma();
  const row = await prisma.contractNumberSettings.findUnique({
    where: { id: tenantId },
    select: { yearMonth: true, lastSequence: true },
  });
  if (!row) {
    await prisma.contractNumberSettings.create({
      data: {
        id: tenantId,
        yearMonth: parsed.yearMonth,
        lastSequence: parsed.sequence,
      },
    });
    return;
  }
  const nextYearMonth =
    row.yearMonth === parsed.yearMonth
      ? row.yearMonth
      : parsed.yearMonth > row.yearMonth
        ? parsed.yearMonth
        : row.yearMonth;
  const nextSequence =
    nextYearMonth !== row.yearMonth
      ? parsed.sequence
      : Math.max(row.lastSequence, parsed.sequence);
  if (nextYearMonth === row.yearMonth && nextSequence === row.lastSequence) return;
  await prisma.contractNumberSettings.update({
    where: { id: tenantId },
    data: {
      yearMonth: nextYearMonth,
      lastSequence: nextSequence,
    },
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const clinic = await prisma.clinic.findUnique({
    where: { id },
    select: {
      contractNumber: true,
      contractDoc: {
        select: {
          data: true,
          mimeType: true,
          fileName: true,
        },
      },
    },
  });
  if (!clinic) {
    return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
  }
  if (!clinic.contractDoc?.data) {
    return NextResponse.json({ error: "Договор не загружен" }, { status: 404 });
  }

  const fallbackName = composeAttachmentName(clinic.contractNumber || "dogovor");
  const fileName = clinic.contractDoc.fileName.trim() || fallbackName;
  const mime =
    clinic.contractDoc.mimeType ||
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return new NextResponse(new Uint8Array(clinic.contractDoc.data), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const clinic = await prisma.clinic.findUnique({
    where: { id },
    select: {
      id: true,
      tenantId: true,
      name: true,
      legalFullName: true,
      legalAddress: true,
      inn: true,
      kpp: true,
      ogrn: true,
      bankName: true,
      bik: true,
      settlementAccount: true,
      correspondentAccount: true,
      ceoName: true,
      phone: true,
      email: true,
    },
  });
  if (!clinic) {
    return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "Ожидается multipart/form-data" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Поле file обязательно" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_DOCX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Файл договора должен быть от 1 байта до 12 МБ" },
        { status: 400 },
      );
    }
    if (!/\.docx$/i.test(file.name)) {
      return NextResponse.json({ error: "Нужен файл .docx" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const extractedNumber = await extractContractNumberFromDocxBuffer(bytes);
    const nextNumber = extractedNumber?.trim() || null;
    const updated = await prisma.clinic.update({
      where: { id },
      data: {
        contractSigned: true,
        contractNumber: nextNumber,
      },
      select: {
        contractNumber: true,
      },
    });
    await prisma.clinicContractDoc.upsert({
      where: { clinicId: id },
      create: {
        clinicId: id,
        fileName:
          file.name.trim() || composeAttachmentName(nextNumber || "dogovor"),
        mimeType:
          file.type ||
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        data: toDbBytes(bytes),
      },
      update: {
        fileName:
          file.name.trim() || composeAttachmentName(nextNumber || "dogovor"),
        mimeType:
          file.type ||
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        data: toDbBytes(bytes),
      },
    });
    if (nextNumber) {
      await syncContractSequenceIfNeeded(clinic.tenantId, nextNumber);
    }
    return NextResponse.json({
      ok: true,
      contractNumber: updated.contractNumber,
      hasContract: true,
      extractedNumber: nextNumber,
    });
  }

  let body: JsonBody;
  try {
    body = (await req.json()) as JsonBody;
  } catch {
    return NextResponse.json({ error: "Ожидается JSON или multipart/form-data" }, { status: 400 });
  }

  if (body.action === "prefill") {
    const now = new Date();
    const currentYm = formatYearMonthYYMM(now);
    const counter = await prisma.contractNumberSettings.findUnique({
      where: { id: clinic.tenantId },
      select: { yearMonth: true, lastSequence: true },
    });
    const nextSeq =
      counter && counter.yearMonth === currentYm ? counter.lastSequence + 1 : 1;
    const nextNumber = formatContractNumber(currentYm, nextSeq);
    const values = buildDraftValues(clinic, nextNumber, now);
    return NextResponse.json({ ok: true, values });
  }

  if (body.action === "assemble") {
    const values = asDraftValues(body.values);
    if (!values) {
      return NextResponse.json({ error: "Некорректные данные формы договора" }, { status: 400 });
    }
    const generated = await generateContractDocxFromTemplate(values);
    const editorHtml = await convertDocxToEditableHtml(generated.docx);
    return NextResponse.json({
      ok: true,
      editorText: generated.text,
      editorHtml,
      contractNumber: values.contractNumber,
    });
  }

  if (body.action === "save-generated") {
    const values = asDraftValues(body.values);
    if (!values) {
      return NextResponse.json({ error: "Некорректные данные договора" }, { status: 400 });
    }
    const editedHtml = String(body.editedHtml ?? "").trim();
    if (!editedHtml) {
      return NextResponse.json({ error: "Пустой HTML редактора договора" }, { status: 400 });
    }
    const contractNumber = values.contractNumber;
    const editedDocx = await convertEditableHtmlToDocx(editedHtml);
    await prisma.clinic.update({
      where: { id },
      data: {
        contractSigned: true,
        contractNumber,
      },
    });
    await prisma.clinicContractDoc.upsert({
      where: { clinicId: id },
      create: {
        clinicId: id,
        fileName: composeAttachmentName(contractNumber),
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        data: toDbBytes(editedDocx),
      },
      update: {
        fileName: composeAttachmentName(contractNumber),
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        data: toDbBytes(editedDocx),
      },
    });
    await syncContractSequenceIfNeeded(clinic.tenantId, contractNumber);
    return NextResponse.json({ ok: true, hasContract: true, contractNumber });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
