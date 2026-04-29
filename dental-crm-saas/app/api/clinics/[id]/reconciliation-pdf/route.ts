import { NextResponse } from "next/server";
import {
  buildClinicReconciliationPdfPayload,
  reconciliationPdfFileNameBase,
} from "@/lib/clinic-reconciliation-pdf-data";
import { parseDateRangeUTC } from "@/lib/clinic-finance";
import { getPrisma } from "@/lib/get-prisma";
import { renderClinicReconciliationPdfBuffer } from "@/lib/clinic-reconciliation-pdf-render";

export const runtime = "nodejs";

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

    const clinic = await (await getPrisma()).clinic.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
    }

    const payload = await buildClinicReconciliationPdfPayload(clinic.id, range);
    const buffer = await renderClinicReconciliationPdfBuffer(payload);

    const asciiName = `svarka_${from}_${to}.pdf`.replace(/[^\w.\-]/g, "_");
    const utfName = `${reconciliationPdfFileNameBase(clinic.name, from, to)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(utfName)}`,
      },
    });
  } catch (e) {
    console.error("[GET reconciliation-pdf]", e);
    return NextResponse.json(
      { error: "Не удалось сформировать PDF" },
      { status: 500 },
    );
  }
}
