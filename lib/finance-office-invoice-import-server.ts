/**
 * Пакет счетов фин. отдела: PDF/ZIP → наряд по «Основание».
 * Timezone подписи счёта — как в format-invoice-number-ru (Москва).
 */

import "server-only";

import { OrderAttachmentScope, Prisma, type PrismaClient } from "@prisma/client";
import { applyInvoiceParseToOrder } from "@/lib/apply-invoice-parse-to-order";
import {
  financeInvoiceRowCanApply,
  financeOfficeInvoiceRowKey,
  type FinanceInvoiceImportApplyResult,
  type FinanceInvoiceImportApplyRow,
  type FinanceInvoiceImportPreviewRow,
  type FinanceUpdPoolItemDto,
} from "@/lib/finance-office-invoice-import";
import type { ExpandedInvoicePdf } from "@/lib/finance-office-invoice-zip";
import {
  buildDocFingerprint,
  fingerprintFromStoredInvoice,
  type DocFingerprint,
} from "@/lib/finance-office-doc-fingerprint";
import {
  assignmentFromKeys,
  assignUpdsByFingerprint,
  type UpdPoolItem,
} from "@/lib/finance-office-upd-match";
import { resolveFinanceOfficePdfKind } from "@/lib/finance-office-pdf-kind";
import {
  extractUpdDigitsFromDocumentText,
  extractUpdDigitsFromFileName,
} from "@/lib/extract-upd-number";
import {
  buildInvoiceCaptionRuFromDocumentText,
  buildInvoiceCaptionRuFromFileName,
  formatInvoiceCaptionRu,
  moscowTodayYmd,
} from "@/lib/format-invoice-number-ru";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import {
  extractInvoiceNumberFromDocumentText,
  extractInvoiceNumberFromFileName,
} from "@/lib/invoice-number-extract";
import { normalizeInvoiceParsedLines } from "@/lib/invoice-parsed-types";
import { extractInvoicePdfText } from "@/lib/parse-invoice-pdf-lines";
import {
  extractOrderNumberFromInvoiceBasisText,
  formatInvoiceBasisFoundLabel,
  invoiceFileNameForNumberExtract,
} from "@/lib/parse-invoice-basis-order-number";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import {
  deleteOrderAttachmentFile,
  isOrderAttachmentS3Enabled,
  newOrderAttachmentId,
  writeOrderAttachmentToDisk,
  writeOrderAttachmentToS3,
} from "@/lib/order-attachment-storage";
import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";

export {
  FINANCE_INVOICE_IMPORT_MAX_FILE_BYTES,
  FINANCE_INVOICE_IMPORT_MAX_PDFS,
  expandFinanceInvoiceUploadFiles,
} from "@/lib/finance-office-invoice-zip";
export type { ExpandedInvoicePdf } from "@/lib/finance-office-invoice-zip";

function invoiceCaptionFromPdf(fileName: string, pdfText: string): string {
  const prettyName = invoiceFileNameForNumberExtract(fileName);
  return (
    buildInvoiceCaptionRuFromFileName(prettyName) ??
    buildInvoiceCaptionRuFromDocumentText(pdfText) ??
    extractInvoiceNumberFromFileName(prettyName) ??
    extractInvoiceNumberFromDocumentText(pdfText) ??
    ""
  );
}

function snippetBasis(text: string): string {
  return formatInvoiceBasisFoundLabel(text);
}

function updCaptionFromPdf(fileName: string, pdfText: string): string {
  const prettyName = invoiceFileNameForNumberExtract(fileName);
  const digits =
    extractUpdDigitsFromFileName(prettyName) ??
    extractUpdDigitsFromDocumentText(pdfText);
  if (!digits) return "";
  return formatInvoiceCaptionRu(digits, moscowTodayYmd());
}

function finishRow(
  row: FinanceInvoiceImportPreviewRow,
): FinanceInvoiceImportPreviewRow {
  const apply = financeInvoiceRowCanApply(row);
  return { ...row, apply };
}

function orderLabelOf(order: {
  orderNumber: string;
  patientName: string | null;
  doctor: { fullName: string };
  clinic: { name: string } | null;
}): string {
  const patient = personNameSurnameInitials(order.patientName);
  const doctor = personNameSurnameInitials(order.doctor.fullName ?? "");
  const clinic = order.clinic?.name?.trim() || "";
  return [order.orderNumber, patient || "без пациента", doctor, clinic]
    .filter(Boolean)
    .join(" · ");
}

export async function buildFinanceInvoiceImportPreview(
  prisma: PrismaClient,
  tenantId: string,
  pdfs: ExpandedInvoicePdf[],
): Promise<{
  rows: FinanceInvoiceImportPreviewRow[];
  updPool: FinanceUpdPoolItemDto[];
}> {
  type ParsedPdf = {
    pdf: ExpandedInvoicePdf;
    text: string;
    kind: "invoice" | "upd";
    extractError: string | null;
    fingerprint: DocFingerprint;
  };

  const parsed: ParsedPdf[] = [];
  for (const pdf of pdfs) {
    const extracted = await extractInvoicePdfText(pdf.buf);
    const text = extracted.text || "";
    const extractError = extracted.error
      ? extracted.error
      : !text.trim()
        ? "В PDF не найден текст (возможно, скан без OCR)"
        : null;
    const kind = resolveFinanceOfficePdfKind(pdf.fileName, text);
    parsed.push({
      pdf,
      text,
      kind,
      extractError,
      fingerprint: buildDocFingerprint(text, pdf.fileName),
    });
  }

  const invoiceParsed = parsed.filter((p) => p.kind === "invoice");
  const updParsed = parsed.filter((p) => p.kind === "upd");

  const updPoolItems: UpdPoolItem[] = updParsed.map((p) => {
    const key = financeOfficeInvoiceRowKey(p.pdf.fileName, p.pdf.sourceArchive);
    return {
      key,
      number:
        extractUpdDigitsFromFileName(p.pdf.fileName) ??
        extractUpdDigitsFromDocumentText(p.text) ??
        "",
      fileName: p.pdf.fileName,
      fingerprint: p.fingerprint,
    };
  });
  const updPoolDto: FinanceUpdPoolItemDto[] = updPoolItems.map((u) => {
    const src = updParsed.find(
      (p) =>
        financeOfficeInvoiceRowKey(p.pdf.fileName, p.pdf.sourceArchive) === u.key,
    );
    return {
      key: u.key,
      number: u.number,
      fileName: u.fileName,
      sourceArchive: src?.pdf.sourceArchive ?? null,
    };
  });
  const updDtoByKey = new Map(updPoolDto.map((u) => [u.key, u]));

  const attachUpdFields = (
    rowKey: string,
    assigned: ReturnType<typeof assignUpdsByFingerprint>,
  ): Pick<
    FinanceInvoiceImportPreviewRow,
    "updNumberRaw" | "updMatch" | "updItems"
  > => {
    const keys = assigned.keysByInvoice.get(rowKey) ?? [];
    const asg = assignmentFromKeys(keys);
    if (asg.match !== "none") {
      const items = asg.keys
        .map((k) => updDtoByKey.get(k))
        .filter((x): x is FinanceUpdPoolItemDto => Boolean(x));
      return {
        updNumberRaw: items.length === 1 ? items[0]!.number : "",
        updMatch: asg.match,
        updItems: items,
      };
    }
    const ambKeys = assigned.ambiguousByInvoice.get(rowKey) ?? [];
    const ambItems = ambKeys
      .map((k) => updDtoByKey.get(k))
      .filter((x): x is FinanceUpdPoolItemDto => Boolean(x));
    if (ambItems.length > 0) {
      return {
        updNumberRaw: ambItems[0]!.number,
        updMatch: "ambiguous",
        updItems: ambItems,
      };
    }
    return { updNumberRaw: "", updMatch: "none", updItems: [] };
  };

  if (invoiceParsed.length > 0) {
    const invoiceWork: Array<{
      pdf: ExpandedInvoicePdf;
      orderNumber: string;
      invoiceNumberRaw: string;
      basisSnippet: string;
      errors: string[];
      fingerprint: DocFingerprint;
    }> = [];

    for (const p of invoiceParsed) {
      const errors: string[] = [];
      if (p.extractError) errors.push(p.extractError);
      const orderNumber = extractOrderNumberFromInvoiceBasisText(p.text) ?? "";
      if (!orderNumber && errors.length === 0) {
        errors.push("Не найден номер наряда в «Основание»");
      }
      invoiceWork.push({
        pdf: p.pdf,
        orderNumber,
        invoiceNumberRaw: invoiceCaptionFromPdf(p.pdf.fileName, p.text),
        basisSnippet: snippetBasis(p.text),
        errors,
        fingerprint: p.fingerprint,
      });
    }

    const numbers = Array.from(
      new Set(
        invoiceWork.map((p) => p.orderNumber).filter((n) => ORDER_NUMBER_PATTERN.test(n)),
      ),
    );
    const orders = numbers.length
      ? await prisma.order.findMany({
          where: { tenantId, archivedAt: null, orderNumber: { in: numbers } },
          select: {
            id: true,
            orderNumber: true,
            patientName: true,
            invoiceAttachmentId: true,
            invoiceIssued: true,
            invoiceNumber: true,
            updAttachmentId: true,
            doctor: { select: { fullName: true } },
            clinic: { select: { name: true } },
          },
        })
      : [];
    const byNumber = new Map(orders.map((o) => [o.orderNumber, o]));
    const fpMap = new Map<string, DocFingerprint>();
    for (const p of invoiceWork) {
      fpMap.set(
        financeOfficeInvoiceRowKey(p.pdf.fileName, p.pdf.sourceArchive),
        p.fingerprint,
      );
    }
    const assigned = assignUpdsByFingerprint(fpMap, updPoolItems);

    const rows = invoiceWork.map((p) => {
      const key = financeOfficeInvoiceRowKey(p.pdf.fileName, p.pdf.sourceArchive);
      const errors = [...p.errors];
      const order = p.orderNumber ? byNumber.get(p.orderNumber) : undefined;
      if (p.orderNumber && !order) {
        errors.push("Наряд с таким номером не найден");
      }
      const alreadyHasInvoice = Boolean(
        order &&
          (order.invoiceAttachmentId ||
            order.invoiceIssued ||
            String(order.invoiceNumber || "").trim()),
      );
      return finishRow({
        key,
        fileName: p.pdf.fileName,
        sourceArchive: p.pdf.sourceArchive,
        invoiceNumberRaw: p.invoiceNumberRaw,
        orderNumber: p.orderNumber,
        orderId: order?.id ?? null,
        orderLabel: order ? orderLabelOf(order) : null,
        alreadyHasInvoice,
        alreadyHasUpd: Boolean(order?.updAttachmentId),
        apply: false,
        errors,
        basisSnippet: p.basisSnippet,
        sourceKind: "drop-invoice",
        invoiceAttachmentId: order?.invoiceAttachmentId ?? null,
        ...attachUpdFields(key, assigned),
      });
    });
    return { rows, updPool: updPoolDto };
  }

  const crmRows = await buildCrmInvoiceRowsForUpdPool({
    prisma,
    tenantId,
    updPoolItems,
    updPoolDto,
    attachUpdFields,
  });
  return { rows: crmRows, updPool: updPoolDto };
}

async function buildCrmInvoiceRowsForUpdPool(opts: {
  prisma: PrismaClient;
  tenantId: string;
  updPoolItems: UpdPoolItem[];
  updPoolDto: FinanceUpdPoolItemDto[];
  attachUpdFields: (
    rowKey: string,
    assigned: ReturnType<typeof assignUpdsByFingerprint>,
  ) => Pick<
    FinanceInvoiceImportPreviewRow,
    "updNumberRaw" | "updMatch" | "updItems"
  >;
}): Promise<FinanceInvoiceImportPreviewRow[]> {
  const inns = [
    ...new Set(
      opts.updPoolItems
        .map((u) => u.fingerprint.buyerInn)
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  if (inns.length === 0) {
    return opts.updPoolItems.map((u) =>
      finishRow({
        key: `orphan::${u.key}`,
        fileName: "",
        sourceArchive: null,
        invoiceNumberRaw: "",
        orderNumber: "",
        orderId: null,
        orderLabel: null,
        alreadyHasInvoice: false,
        apply: false,
        errors: ["Счёт не найден (нет ИНН покупателя в УПД)"],
        basisSnippet: "",
        sourceKind: "crm-invoice",
        invoiceAttachmentId: null,
        updNumberRaw: u.number,
        updMatch: "one",
        updItems: opts.updPoolDto.filter((d) => d.key === u.key),
      }),
    );
  }

  const clients = await getClientsPrisma();
  const clinics = await clients.clinic.findMany({
    where: { tenantId: opts.tenantId, inn: { in: inns } },
    select: { id: true, inn: true, name: true },
  });
  const clinicIds = clinics.map((c) => c.id);
  const orders = clinicIds.length
    ? await opts.prisma.order.findMany({
        where: {
          tenantId: opts.tenantId,
          archivedAt: null,
          invoiceAttachmentId: { not: null },
          clinicId: { in: clinicIds },
        },
        orderBy: { updatedAt: "desc" },
        take: 400,
        select: {
          id: true,
          orderNumber: true,
          patientName: true,
          invoiceAttachmentId: true,
          invoiceIssued: true,
          invoiceNumber: true,
          invoiceParsedTotalRub: true,
          invoiceParsedLines: true,
          updAttachmentId: true,
          clinicId: true,
          doctor: { select: { fullName: true } },
          clinic: { select: { name: true } },
        },
      })
    : [];

  const innByClinic = new Map(clinics.map((c) => [c.id, (c.inn || "").trim()]));
  const fpMap = new Map<string, DocFingerprint>();
  const orderByRowKey = new Map<(typeof orders)[number]["id"], (typeof orders)[number]>();
  for (const o of orders) {
    const lines = normalizeInvoiceParsedLines(o.invoiceParsedLines) ?? [];
    const fp = fingerprintFromStoredInvoice({
      buyerInn: o.clinicId ? innByClinic.get(o.clinicId) ?? null : null,
      totalRub: o.invoiceParsedTotalRub,
      invoiceNumber: o.invoiceNumber,
      codes: lines.map((l) => l.code || "").filter((c) => /^-\d{4,5}$/.test(c)),
    });
    const key = `crm::${o.id}`;
    fpMap.set(key, fp);
    orderByRowKey.set(o.id, o);
  }
  const assigned = assignUpdsByFingerprint(fpMap, opts.updPoolItems);
  const usedUpd = new Set<string>();
  const rows: FinanceInvoiceImportPreviewRow[] = [];
  for (const o of orders) {
    const key = `crm::${o.id}`;
    const updPart = opts.attachUpdFields(key, assigned);
    if ((updPart.updItems?.length ?? 0) === 0) continue;
    for (const it of updPart.updItems ?? []) usedUpd.add(it.key);
    rows.push(
      finishRow({
        key,
        fileName: o.invoiceNumber?.trim() || "Счёт в CRM",
        sourceArchive: null,
        invoiceNumberRaw: o.invoiceNumber ?? "",
        orderNumber: o.orderNumber,
        orderId: o.id,
        orderLabel: orderLabelOf(o),
        alreadyHasInvoice: true,
        alreadyHasUpd: Boolean(o.updAttachmentId),
        apply: false,
        errors: [],
        basisSnippet: "Счёт уже в наряде",
        sourceKind: "crm-invoice",
        invoiceAttachmentId: o.invoiceAttachmentId,
        ...updPart,
      }),
    );
  }
  for (const u of opts.updPoolItems) {
    if (usedUpd.has(u.key)) continue;
    rows.push(
      finishRow({
        key: `orphan::${u.key}`,
        fileName: "",
        sourceArchive: null,
        invoiceNumberRaw: "",
        orderNumber: "",
        orderId: null,
        orderLabel: null,
        alreadyHasInvoice: false,
        apply: false,
        errors: ["Счёт не найден"],
        basisSnippet: "",
        sourceKind: "crm-invoice",
        invoiceAttachmentId: null,
        updNumberRaw: u.number,
        updMatch: "one",
        updItems: opts.updPoolDto.filter((d) => d.key === u.key),
      }),
    );
  }
  return rows;
}

async function storeInvoiceBytes(
  orderId: string,
  attachmentId: string,
  fileBuf: Buffer,
  mimeType: string,
): Promise<{ diskRelPath: string; dataForDb: Buffer }> {
  if (isOrderAttachmentS3Enabled()) {
    try {
      const diskRelPath = await writeOrderAttachmentToS3(
        orderId,
        attachmentId,
        fileBuf,
        mimeType,
      );
      return { diskRelPath, dataForDb: Buffer.alloc(0) };
    } catch (e) {
      console.error("[invoice-import] S3 write failed, disk", e);
    }
  }
  const diskRelPath = await writeOrderAttachmentToDisk(
    orderId,
    attachmentId,
    fileBuf,
  );
  return { diskRelPath, dataForDb: Buffer.alloc(0) };
}

export async function attachInvoicePdfToOrder(opts: {
  prisma: PrismaClient;
  tenantId: string;
  orderId: string;
  fileName: string;
  buf: Buffer;
  invoiceNumberRaw: string;
}): Promise<void> {
  const order = await opts.prisma.order.findFirst({
    where: { id: opts.orderId, tenantId: opts.tenantId, archivedAt: null },
    select: { id: true, invoiceAttachmentId: true },
  });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }
  const prevId = order.invoiceAttachmentId;
  const attachmentId = newOrderAttachmentId();
  const mimeType = "application/pdf";
  const stored = await storeInvoiceBytes(
    order.id,
    attachmentId,
    opts.buf,
    mimeType,
  );
  const prettyName = invoiceFileNameForNumberExtract(opts.fileName);
  const caption =
    String(opts.invoiceNumberRaw || "").trim() ||
    buildInvoiceCaptionRuFromFileName(prettyName) ||
    null;

  const row = await opts.prisma.orderAttachment.create({
    data: {
      id: attachmentId,
      orderId: order.id,
      scope: OrderAttachmentScope.GENERAL,
      fileName: opts.fileName,
      mimeType,
      size: opts.buf.byteLength,
      data: new Uint8Array(stored.dataForDb),
      diskRelPath: stored.diskRelPath,
    },
    select: { id: true },
  });

  await opts.prisma.order.update({
    where: { id: order.id },
    data: {
      invoiceAttachmentId: row.id,
      invoiceIssued: true,
      invoiceIssuedAt: new Date(),
      invoiceParsedLines: Prisma.DbNull,
      invoiceParsedTotalRub: null,
      invoiceParsedSummaryText: null,
      ...(caption ? { invoiceNumber: caption } : {}),
    },
  });

  if (prevId && prevId !== row.id) {
    try {
      const doomed = await opts.prisma.orderAttachment.findUnique({
        where: { id: prevId },
        select: { diskRelPath: true },
      });
      await opts.prisma.orderAttachment.deleteMany({ where: { id: prevId } });
      await deleteOrderAttachmentFile(doomed?.diskRelPath ?? null);
    } catch (e) {
      console.error("[invoice-import] replace old invoice", order.id, e);
    }
  }
}

export async function attachUpdPdfToOrder(opts: {
  prisma: PrismaClient;
  tenantId: string;
  orderId: string;
  fileName: string;
  buf: Buffer;
  updNumberRaw: string;
}): Promise<void> {
  const order = await opts.prisma.order.findFirst({
    where: { id: opts.orderId, tenantId: opts.tenantId, archivedAt: null },
    select: { id: true, updAttachmentId: true },
  });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }
  const prevId = order.updAttachmentId;
  const attachmentId = newOrderAttachmentId();
  const mimeType = "application/pdf";
  const stored = await storeInvoiceBytes(order.id, attachmentId, opts.buf, mimeType);
  const prettyName = invoiceFileNameForNumberExtract(opts.fileName);
  const digits =
    extractUpdDigitsFromFileName(prettyName) ??
    (String(opts.updNumberRaw || "").replace(/\D/g, "") || null);
  const caption = digits ? formatInvoiceCaptionRu(digits, moscowTodayYmd()) : null;

  const row = await opts.prisma.orderAttachment.create({
    data: {
      id: attachmentId,
      orderId: order.id,
      scope: OrderAttachmentScope.UPD,
      fileName: opts.fileName,
      mimeType,
      size: opts.buf.byteLength,
      data: new Uint8Array(stored.dataForDb),
      diskRelPath: stored.diskRelPath,
    },
    select: { id: true },
  });

  await opts.prisma.order.update({
    where: { id: order.id },
    data: {
      updAttachmentId: row.id,
      ...(caption ? { updNumber: caption } : {}),
    },
  });

  if (prevId && prevId !== row.id) {
    try {
      const doomed = await opts.prisma.orderAttachment.findUnique({
        where: { id: prevId },
        select: { diskRelPath: true },
      });
      await opts.prisma.orderAttachment.deleteMany({ where: { id: prevId } });
      await deleteOrderAttachmentFile(doomed?.diskRelPath ?? null);
    } catch (e) {
      console.error("[invoice-import] replace old UPD", order.id, e);
    }
  }
}

export async function applyFinanceInvoiceImport(opts: {
  prisma: PrismaClient;
  tenantId: string;
  rows: FinanceInvoiceImportApplyRow[];
  pdfs: ExpandedInvoicePdf[];
  onRow?: (info: {
    done: number;
    total: number;
    result: FinanceInvoiceImportApplyResult;
  }) => void | Promise<void>;
}): Promise<{
  results: FinanceInvoiceImportApplyResult[];
  parseOrderIds: string[];
}> {
  const byKey = new Map(
    opts.pdfs.map((p) => [
      financeOfficeInvoiceRowKey(p.fileName, p.sourceArchive),
      p,
    ]),
  );
  const results: FinanceInvoiceImportApplyResult[] = [];
  const parseOrderIds: string[] = [];
  const workTotal = opts.rows.filter((r) => r.apply).length;
  let done = 0;

  const pushTracked = async (result: FinanceInvoiceImportApplyResult) => {
    results.push(result);
    done += 1;
    await opts.onRow?.({ done, total: workTotal, result });
  };

  for (const row of opts.rows) {
    if (!row.apply) {
      results.push({
        key: row.key,
        orderNumber: row.orderNumber,
        ok: false,
        message: "Строка пропущена",
      });
      continue;
    }
    const orderNumber = String(row.orderNumber || "").trim();
    if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
      await pushTracked({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Некорректный номер наряда",
      });
      continue;
    }
    const sourceKind = row.sourceKind === "crm-invoice" ? "crm-invoice" : "drop-invoice";
    const updKeys = (row.updKeys ?? []).filter(Boolean);
    if (updKeys.length > 1) {
      await pushTracked({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Несколько УПД",
      });
      continue;
    }
    const updPdf = updKeys[0] ? byKey.get(updKeys[0]) : null;
    if (updKeys.length === 1 && !updPdf) {
      await pushTracked({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Файл УПД не найден в пакете",
      });
      continue;
    }
    const invoicePdf = sourceKind === "drop-invoice" ? byKey.get(row.key) : null;
    if (sourceKind === "drop-invoice" && !invoicePdf) {
      await pushTracked({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Файл счёта не найден в пакете",
      });
      continue;
    }
    if (!invoicePdf && !updPdf) {
      if (sourceKind === "crm-invoice") {
        await pushTracked({
          key: row.key,
          orderNumber,
          ok: true,
          message: "УПД не прикреплён",
        });
        continue;
      }
      await pushTracked({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Нет УПД",
      });
      continue;
    }
    const order = await opts.prisma.order.findFirst({
      where: {
        tenantId: opts.tenantId,
        archivedAt: null,
        orderNumber,
      },
      select: { id: true },
    });
    if (!order) {
      await pushTracked({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Наряд не найден",
      });
      continue;
    }
    try {
      if (invoicePdf) {
        await attachInvoicePdfToOrder({
          prisma: opts.prisma,
          tenantId: opts.tenantId,
          orderId: order.id,
          fileName: invoicePdf.fileName,
          buf: invoicePdf.buf,
          invoiceNumberRaw: row.invoiceNumberRaw,
        });
        parseOrderIds.push(order.id);
      }
      if (updPdf) {
        await attachUpdPdfToOrder({
          prisma: opts.prisma,
          tenantId: opts.tenantId,
          orderId: order.id,
          fileName: updPdf.fileName,
          buf: updPdf.buf,
          updNumberRaw: row.updNumberRaw ?? "",
        });
      }
      await pushTracked({
        key: row.key,
        orderNumber,
        ok: true,
        message:
          invoicePdf && updPdf
            ? "Счёт и УПД прикреплены"
            : invoicePdf
              ? "Счёт прикреплён"
              : "УПД прикреплён",
      });
    } catch (e) {
      console.error("[invoice-import] apply", orderNumber, e);
      await pushTracked({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Не удалось сохранить файлы",
      });
    }
  }

  return { results, parseOrderIds };
}

export async function parseAttachedInvoicesInBackground(
  prisma: PrismaClient,
  orderIds: string[],
): Promise<void> {
  for (const orderId of orderIds) {
    try {
      await applyInvoiceParseToOrder(prisma, orderId);
    } catch (e) {
      console.error("[invoice-import] parse after attach", orderId, e);
    }
  }
}
