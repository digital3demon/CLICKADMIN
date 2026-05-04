import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { applyInvoiceParseToOrder } from "@/lib/apply-invoice-parse-to-order";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

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

    const prisma = await getOrdersPrisma();
    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
    }
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
