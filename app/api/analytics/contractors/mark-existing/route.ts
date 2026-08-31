import { NextResponse } from "next/server";
import { requireFinancialAnalytics } from "@/lib/auth/analytics-guard";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

/**
 * Пометить врача или клинику как «не новые»: были в работе раньше,
 * чем заведены в CRM.
 */
export async function POST(req: Request) {
  try {
    const gate = await requireFinancialAnalytics();
    if (gate instanceof NextResponse) return gate;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
    }
    const kind =
      typeof body === "object" && body !== null && "kind" in body
        ? String((body as { kind?: unknown }).kind ?? "")
        : "";
    const id =
      typeof body === "object" && body !== null && "id" in body
        ? String((body as { id?: unknown }).id ?? "").trim()
        : "";
    if (!id || (kind !== "doctor" && kind !== "clinic")) {
      return NextResponse.json(
        { error: "Укажите kind: doctor | clinic и id" },
        { status: 400 },
      );
    }

    const prisma = await getPrisma();
    if (kind === "doctor") {
      const row = await prisma.doctor.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!row) {
        return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
      }
      await prisma.doctor.update({
        where: { id },
        data: { analyticsTreatAsExisting: true },
      });
    } else {
      const row = await prisma.clinic.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!row) {
        return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
      }
      await prisma.clinic.update({
        where: { id },
        data: { analyticsTreatAsExisting: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[analytics/contractors/mark-existing]", e);
    return NextResponse.json(
      { error: "Не удалось сохранить пометку" },
      { status: 500 },
    );
  }
}
