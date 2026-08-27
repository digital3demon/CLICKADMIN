import { NextResponse } from "next/server";
import { parseDateRangeUTC } from "@/lib/clinic-finance";
import { getPrisma } from "@/lib/get-prisma";
import { buildClinicReconciliationXlsxBuffer } from "@/lib/clinic-reconciliation-xlsx";
import {
  reconciliationAttachmentDisposition,
  reconciliationFileAsciiStem,
  reconciliationFileStem,
} from "@/lib/clinic-reconciliation-filename";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const prisma = await getPrisma();
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const selectedOrderIds = (url.searchParams.get("orderIds") ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const range = parseDateRangeUTC(from, to);
    if (!range) {
      return NextResponse.json(
        { error: "Укажите период: параметры from и to в формате YYYY-MM-DD" },
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

    const { buffer } = await buildClinicReconciliationXlsxBuffer(
      clinic.id,
      clinic.name,
      range,
      selectedOrderIds,
    );

    const utfName = `${reconciliationFileStem(clinic.name, from, to)}.xlsx`;
    const asciiName = `${reconciliationFileAsciiStem(from, to)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Cache-Control": "no-store",
        "Content-Disposition": reconciliationAttachmentDisposition(utfName, asciiName),
      },
    });
  } catch (e) {
    console.error("[GET reconciliation]", e);
    return NextResponse.json(
      { error: "Не удалось сформировать файл" },
      { status: 500 },
    );
  }
}
