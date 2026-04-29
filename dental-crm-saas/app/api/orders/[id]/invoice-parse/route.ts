import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { applyInvoiceParseToOrder } from "@/lib/apply-invoice-parse-to-order";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** POST: разобрать прикреплённый файл счёта (PDF) и записать позиции/сумму в наряд. */
export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { id: orderIdRaw } = await ctx.params;
    const orderId = orderIdRaw?.trim() ?? "";
    if (!orderId) {
      return NextResponse.json({ error: "Некорректный id наряда" }, { status: 400 });
    }

    const prisma = await getPrisma();
    const applied = await applyInvoiceParseToOrder(prisma, orderId);

    if (!applied.ok) {
      if (applied.error === "no_order") {
        return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
      }
      if (applied.error === "no_attachment") {
        return NextResponse.json(
          { error: "Нет загруженного файла счёта" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Не удалось разобрать счёт" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      lines: applied.lines,
      totalRub: applied.totalRub,
      summaryText: applied.summaryText,
      warnings: applied.warnings,
      suggestedInvoiceNumber: applied.suggestedInvoiceNumber,
      invoiceNumberApplied: applied.invoiceNumberApplied,
    });
  } catch (e) {
    console.error("[invoice-parse]", e);
    return NextResponse.json(
      { error: "Не удалось разобрать счёт" },
      { status: 500 },
    );
  }
}
