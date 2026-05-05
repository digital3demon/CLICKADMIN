import { NextResponse } from "next/server";
import {
  buildContractTemplateFields,
  buildDraftValues,
  extractContractTemplatePlaceholders,
  extractContractNumberFromDocxBuffer,
  formatContractNumber,
  formatYearMonthYYMM,
  generateContractDocxFromTemplateFields,
  parseGeneratedContractNumber,
  type ContractTemplateField,
} from "@/lib/clinic-contract";
import { getPrisma } from "@/lib/get-prisma";

const MAX_DOCX_SIZE_BYTES = 12 * 1024 * 1024;

type JsonBody =
  | { action: "prefill" }
  | {
      action: "save-generated";
      fields: ContractTemplateField[];
    };

function asTemplateFields(v: unknown): ContractTemplateField[] | null {
  if (!Array.isArray(v)) return null;
  const out: ContractTemplateField[] = [];
  for (const row of v) {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    out.push({
      key: String(r.key ?? "").trim(),
      label: String(r.label ?? "").trim(),
      value: String(r.value ?? ""),
    });
  }
  return out;
}

function pickFieldValue(fields: ContractTemplateField[], matcher: (k: string) => boolean) {
  for (const f of fields) {
    const key = `${f.key} ${f.label}`.toLowerCase();
    if (matcher(key)) return f.value.trim();
  }
  return "";
}

function pickContractNumber(fields: ContractTemplateField[]): string {
  const explicit = pickFieldValue(
    fields,
    (k) => k.includes("номер") && k.includes("договор"),
  );
  if (explicit) return explicit;
  const synthetic = fields.find((f) => f.key === "__contract_number__")?.value.trim();
  return synthetic || "";
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
      phoneAccounting: true,
      phoneManagement: true,
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
    return NextResponse.json(
      { error: "Не удалось прочитать тело запроса. Повторите сохранение договора." },
      { status: 400 },
    );
  }

  if (body.action === "prefill") {
    const template = await prisma.contractTemplateSettings.findUnique({
      where: { id: clinic.tenantId },
      select: {
        fileName: true,
        docxBytes: true,
        placeholders: true,
      },
    });
    if (!template?.docxBytes) {
      return NextResponse.json(
        {
          error:
            "Сначала загрузите шаблон договора в «Конфигурация → Шаблон договора».",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const currentYm = formatYearMonthYYMM(now);
    const counter = await prisma.contractNumberSettings.findUnique({
      where: { id: clinic.tenantId },
      select: { yearMonth: true, lastSequence: true },
    });
    const nextSeq =
      counter && counter.yearMonth === currentYm ? counter.lastSequence + 1 : 1;
    const nextNumber = formatContractNumber(currentYm, nextSeq);
    const placeholders =
      Array.isArray(template.placeholders) && template.placeholders.length > 0
        ? template.placeholders
            .map((x) => String(x ?? "").trim())
            .filter((x) => x.length > 0)
        : await extractContractTemplatePlaceholders(Buffer.from(template.docxBytes));
    const fields = buildContractTemplateFields(placeholders, clinic, nextNumber, now);
    return NextResponse.json({
      ok: true,
      templateFileName: template.fileName,
      fields,
    });
  }

  if (body.action === "save-generated") {
    const fields = asTemplateFields(body.fields);
    if (!fields || fields.length === 0) {
      return NextResponse.json(
        { error: "Некорректные поля договора" },
        { status: 400 },
      );
    }
    const template = await prisma.contractTemplateSettings.findUnique({
      where: { id: clinic.tenantId },
      select: { docxBytes: true },
    });
    if (!template?.docxBytes) {
      return NextResponse.json(
        { error: "Шаблон договора не загружен в конфигурации" },
        { status: 400 },
      );
    }
    const contractNumber = pickContractNumber(fields);
    if (!contractNumber) {
      return NextResponse.json(
        { error: "Заполните номер договора" },
        { status: 400 },
      );
    }
    const fallbackValues = buildDraftValues(clinic, contractNumber, new Date());
    fallbackValues.contractDate =
      pickFieldValue(fields, (k) => k.includes("дата")) || fallbackValues.contractDate;
    fallbackValues.orgShortName =
      pickFieldValue(fields, (k) => k.includes("наимен")) ||
      fallbackValues.orgShortName;
    fallbackValues.inn =
      pickFieldValue(fields, (k) => k.includes("инн")) || fallbackValues.inn;
    fallbackValues.ceoName =
      pickFieldValue(fields, (k) => k.includes("фио") || k.includes("директор")) ||
      fallbackValues.ceoName;
    fallbackValues.email =
      pickFieldValue(fields, (k) => k.includes("почта") || k.includes("email")) ||
      fallbackValues.email;
    fallbackValues.requisitesLine =
      pickFieldValue(fields, (k) => k.includes("реквизит")) ||
      fallbackValues.requisitesLine;

    const generated = await generateContractDocxFromTemplateFields(
      Buffer.from(template.docxBytes),
      fields,
      fallbackValues,
    );
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
        data: toDbBytes(generated),
      },
      update: {
        fileName: composeAttachmentName(contractNumber),
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        data: toDbBytes(generated),
      },
    });
    await syncContractSequenceIfNeeded(clinic.tenantId, contractNumber);
    return NextResponse.json({ ok: true, hasContract: true, contractNumber });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
