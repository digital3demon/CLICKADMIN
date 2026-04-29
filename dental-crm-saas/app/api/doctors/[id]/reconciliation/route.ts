import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import {
  fetchDoctorReconciliationRows,
  parseDateRangeUTC,
} from "@/lib/clinic-finance";
import { getPrisma } from "@/lib/get-prisma";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const range = parseDateRangeUTC(from, to);
    if (!range) {
      return NextResponse.json(
        { error: "Укажите период: параметры from и to в формате YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const doctor = await (await getPrisma()).doctor.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });
    if (!doctor) {
      return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
    }

    const { included, excluded } = await fetchDoctorReconciliationRows(id, range);
    let sum = 0;
    let sumExcluded = 0;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Сверка");

    sheet.addRow([
      "Клиника",
      "Дата заказа",
      "Номер наряда",
      "Позиция",
      "Кол-во",
      "Цена за ед., руб.",
      "Сумма, руб.",
    ]);

    for (const r of included) {
      sum += r.lineTotal;
      sheet.addRow([
        r.clinicName,
        r.orderCreatedAt.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        r.orderNumber,
        r.description,
        r.quantity,
        r.unitPrice ?? "",
        r.lineTotal,
      ]);
    }

    sheet.addRow([]);
    sheet.addRow([
      "Итого",
      "",
      "",
      "",
      "",
      "",
      Math.round(sum * 100) / 100,
    ]);

    if (excluded.length > 0) {
      const sheetEx = workbook.addWorksheet("Исключено из сверки");
      sheetEx.addRow([
        "Клиника",
        "Дата заказа",
        "Номер наряда",
        "Позиция",
        "Кол-во",
        "Цена за ед., руб.",
        "Сумма, руб.",
        "Примечание",
      ]);
      for (const r of excluded) {
        sumExcluded += r.lineTotal;
        sheetEx.addRow([
          r.clinicName,
          r.orderCreatedAt.toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          r.orderNumber,
          r.description,
          r.quantity,
          r.unitPrice ?? "",
          r.lineTotal,
          "В периоде, но не в актуальной сверке",
        ]);
      }
      sheetEx.addRow([]);
      sheetEx.addRow([
        "Итого исключено",
        "",
        "",
        "",
        "",
        "",
        Math.round(sumExcluded * 100) / 100,
        "",
      ]);
    }

    const buf = await workbook.xlsx.writeBuffer();

    const asciiName = `svarka_vrach_${from}_${to}.xlsx`.replace(/[^\w.\-]/g, "_");
    const utfName = `Сверка_${doctor.fullName.slice(0, 60)}_${from}_${to}.xlsx`;

    return new NextResponse(Buffer.from(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(utfName)}`,
      },
    });
  } catch (e) {
    console.error("[GET doctors reconciliation]", e);
    return NextResponse.json(
      { error: "Не удалось сформировать файл" },
      { status: 500 },
    );
  }
}
