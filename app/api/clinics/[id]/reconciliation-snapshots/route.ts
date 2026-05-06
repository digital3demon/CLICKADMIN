import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { buildClinicReconciliationXlsxBuffer, parseRangeFromYmdStrings } from "@/lib/clinic-reconciliation-xlsx";
import { Prisma, ReconciliationSnapshotSlot } from "@prisma/client";
import { recordContractorRevision } from "@/lib/record-contractor-revision";
/** Список автосверок клиники (без файла). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const clinic = await (await getPrisma()).clinic.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
    }

    const rows = await (await getPrisma()).clinicReconciliationSnapshot.findMany({
      where: { clinicId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slot: true,
        periodFromStr: true,
        periodToStr: true,
        periodLabelRu: true,
        legalEntityLabel: true,
        paymentStatus: true,
        paidAt: true,
        downloadedAt: true,
        invoiceFileName: true,
        invoiceNumber: true,
        invoiceUploadedAt: true,
        createdAt: true,
        dismissedAt: true,
      },
    });

    return NextResponse.json({ snapshots: rows });
  } catch (e) {
    console.error("[GET reconciliation-snapshots]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить список" },
      { status: 500 },
    );
  }
}

function periodLabelRu(fromStr: string, toStr: string): string {
  const from = new Date(`${fromStr}T00:00:00.000Z`);
  const to = new Date(`${toStr}T00:00:00.000Z`);
  const fromText = from.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const toText = to.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${fromText} — ${toText}`;
}

/** Зафиксировать период как выставленный в сверку (создать/обновить снимок периода). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }
    const body = (await req.json().catch(() => ({}))) as {
      from?: string;
      to?: string;
      legalEntityLabel?: string | null;
      orderIds?: string[] | null;
    };
    const from = String(body.from ?? "").trim();
    const to = String(body.to ?? "").trim();
    const range = parseRangeFromYmdStrings(from, to);
    if (!range) {
      return NextResponse.json(
        { error: "Укажите период: from и to в формате YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
    }

    const orderIds = Array.isArray(body.orderIds)
      ? body.orderIds
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
      : [];
    const { buffer, fromStr, toStr } = await buildClinicReconciliationXlsxBuffer(
      clinic.id,
      clinic.name,
      range,
      orderIds,
    );
    const legalEntityLabel = String(body.legalEntityLabel ?? "").trim() || "Сверка";
    const label = periodLabelRu(fromStr, toStr);
    const uniqueKey = {
      clinicId: clinic.id,
      slot: ReconciliationSnapshotSlot.MONTHLY_FULL,
      periodFromStr: fromStr,
      periodToStr: toStr,
    } as const;
    const existed = await prisma.clinicReconciliationSnapshot.findUnique({
      where: { clinicId_slot_periodFromStr_periodToStr: uniqueKey },
      select: { id: true },
    });

    const snapshot = await prisma.clinicReconciliationSnapshot.upsert({
      where: {
        clinicId_slot_periodFromStr_periodToStr: uniqueKey,
      },
      update: {
        legalEntityLabel,
        periodLabelRu: label,
        xlsxBytes: Buffer.from(buffer),
        orderIdsJson:
          orderIds.length > 0
            ? (orderIds as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        dismissedAt: null,
      },
      create: {
        clinicId: clinic.id,
        slot: ReconciliationSnapshotSlot.MONTHLY_FULL,
        periodFromStr: fromStr,
        periodToStr: toStr,
        periodLabelRu: label,
        legalEntityLabel,
        xlsxBytes: Buffer.from(buffer),
        orderIdsJson:
          orderIds.length > 0
            ? (orderIds as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
      },
      select: {
        id: true,
        slot: true,
        periodFromStr: true,
        periodToStr: true,
        periodLabelRu: true,
        legalEntityLabel: true,
        paymentStatus: true,
        paidAt: true,
        downloadedAt: true,
        invoiceFileName: true,
        invoiceNumber: true,
        invoiceUploadedAt: true,
        createdAt: true,
        dismissedAt: true,
      },
    });
    try {
      await recordContractorRevision(prisma, {
        kind: "UPDATE",
        clinicId: clinic.id,
        summary: existed
          ? `Сверка обновлена: ${label}`
          : `Сверка сформирована: ${label}`,
      });
    } catch (e) {
      console.error("[reconciliation-snapshots] revision log", e);
    }

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (e) {
    console.error("[POST reconciliation-snapshots]", e);
    return NextResponse.json(
      { error: "Не удалось зафиксировать период сверки" },
      { status: 500 },
    );
  }
}
