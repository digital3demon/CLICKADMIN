import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { recordContractorRevision } from "@/lib/record-contractor-revision";
import {
  ORDER_PAYMENT_RECON_PAID,
  ORDER_PAYMENT_RECON_UNPAID,
  ORDER_PAYMENT_SVERKA,
} from "@/lib/order-clinic-client-fields";
import {
  buildClinicReconciliationXlsxBuffer,
  parseRangeFromYmdStrings,
} from "@/lib/clinic-reconciliation-xlsx";
/** Скачать автосверку (xlsx). Сборка заново — иначе в БД лежит старый жёлто-зелёный файл. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const row = await prisma.clinicReconciliationSnapshot.findUnique({
      where: { id: id.trim() },
      select: {
        id: true,
        clinicId: true,
        periodFromStr: true,
        periodToStr: true,
        xlsxBytes: true,
        orderIdsJson: true,
        clinic: { select: { name: true } },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    const asciiName = `svarka_auto_${row.periodFromStr}_${row.periodToStr}.xlsx`.replace(
      /[^\w.\-]/g,
      "_",
    );

    let u8: Uint8Array;
    const range = parseRangeFromYmdStrings(row.periodFromStr, row.periodToStr);
    const orderIds =
      Array.isArray(row.orderIdsJson) &&
      row.orderIdsJson.every((x) => typeof x === "string")
        ? (row.orderIdsJson as string[])
        : [];
    if (range) {
      try {
        const { buffer } = await buildClinicReconciliationXlsxBuffer(
          row.clinicId,
          row.clinic.name,
          range,
          orderIds,
        );
        u8 = new Uint8Array(buffer);
        void prisma.clinicReconciliationSnapshot
          .update({
            where: { id: row.id },
            data: { xlsxBytes: Buffer.from(buffer), downloadedAt: new Date() },
          })
          .catch(() => {});
      } catch (regenErr) {
        console.error("[GET reconciliation-snapshot] regen", regenErr);
        const raw = row.xlsxBytes;
        u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
        void prisma.clinicReconciliationSnapshot
          .update({
            where: { id: row.id },
            data: { downloadedAt: new Date() },
          })
          .catch(() => {});
      }
    } else {
      const raw = row.xlsxBytes;
      u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
      void prisma.clinicReconciliationSnapshot
        .update({
          where: { id: row.id },
          data: { downloadedAt: new Date() },
        })
        .catch(() => {});
    }

    return new NextResponse(Buffer.from(u8), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${asciiName}"`,
      },
    });
  } catch (e) {
    console.error("[GET reconciliation-snapshot file]", e);
    return NextResponse.json({ error: "Ошибка выдачи файла" }, { status: 500 });
  }
}

/** Скрыть уведомление в «Обратите внимание». */
export async function PATCH(
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
      dismissed?: boolean;
      paymentStatus?: "UNPAID" | "PAID";
    };
    const idTrimmed = id.trim();
    if (body.dismissed === true) {
      const before = await prisma.clinicReconciliationSnapshot.findUnique({
        where: { id: idTrimmed },
        select: { id: true, clinicId: true, periodLabelRu: true, dismissedAt: true },
      });
      const updated = await prisma.clinicReconciliationSnapshot.updateMany({
        where: { id: idTrimmed, dismissedAt: null },
        data: { dismissedAt: new Date() },
      });
      if (before && updated.count > 0) {
        try {
          await recordContractorRevision(prisma, {
            kind: "UPDATE",
            clinicId: before.clinicId,
            summary: `Сверка скрыта из уведомлений: ${before.periodLabelRu}`,
          });
        } catch (e) {
          console.error("[reconciliation-snapshot] revision log dismiss", e);
        }
      }
      try {
        revalidateTag("attention-reminders");
      } catch {
        /* ignore */
      }
      return NextResponse.json({ ok: true });
    }
    if (body.paymentStatus !== "UNPAID" && body.paymentStatus !== "PAID") {
      return NextResponse.json(
        { error: "Ожидался dismissed: true или paymentStatus: UNPAID|PAID" },
        { status: 400 },
      );
    }

    const snapshot = await prisma.clinicReconciliationSnapshot.findUnique({
      where: { id: idTrimmed },
      select: {
        id: true,
        clinicId: true,
        periodFromStr: true,
        periodToStr: true,
        orderIdsJson: true,
      },
    });
    if (!snapshot) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    const rangeFrom = new Date(`${snapshot.periodFromStr}T00:00:00.000Z`);
    const rangeTo = new Date(`${snapshot.periodToStr}T23:59:59.999Z`);
    if (Number.isNaN(rangeFrom.getTime()) || Number.isNaN(rangeTo.getTime())) {
      return NextResponse.json({ error: "Некорректный период снимка" }, { status: 400 });
    }
    const orderIds =
      Array.isArray(snapshot.orderIdsJson) &&
      snapshot.orderIdsJson.every((x) => typeof x === "string")
        ? (snapshot.orderIdsJson as string[])
        : [];
    const targetPayment =
      body.paymentStatus === "PAID"
        ? ORDER_PAYMENT_RECON_PAID
        : ORDER_PAYMENT_RECON_UNPAID;
    await prisma.$transaction([
      prisma.clinicReconciliationSnapshot.update({
        where: { id: snapshot.id },
        data: {
          paymentStatus: body.paymentStatus,
          paidAt: body.paymentStatus === "PAID" ? new Date() : null,
        },
      }),
      prisma.order.updateMany({
        where: {
          clinicId: snapshot.clinicId,
          archivedAt: null,
          createdAt: { gte: rangeFrom, lte: rangeTo },
          payment: {
            in: [
              ORDER_PAYMENT_SVERKA,
              ORDER_PAYMENT_RECON_UNPAID,
              ORDER_PAYMENT_RECON_PAID,
            ],
          },
          OR: [
            { excludeFromReconciliation: false },
            { excludeFromReconciliationUntil: { lt: rangeTo } },
          ],
          ...(orderIds.length > 0 ? { id: { in: orderIds } } : {}),
        },
        data: { payment: targetPayment },
      }),
    ]);
    try {
      await recordContractorRevision(prisma, {
        kind: "UPDATE",
        clinicId: snapshot.clinicId,
        summary: `Сверка: статус оплаты «${
          body.paymentStatus === "PAID" ? "Оплачено" : "Не оплачено"
        }» (${snapshot.periodFromStr} — ${snapshot.periodToStr})`,
      });
    } catch (e) {
      console.error("[reconciliation-snapshot] revision log payment", e);
    }

    return NextResponse.json({ ok: true, paymentStatus: body.paymentStatus });
  } catch (e) {
    console.error("[PATCH reconciliation-snapshot]", e);
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}
