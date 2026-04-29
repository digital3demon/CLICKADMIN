import { ContractorRevisionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { recordContractorRevision } from "@/lib/record-contractor-revision";

/** Восстановление мягко удалённого врача. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const row = await prisma.doctor.findUnique({
      where: { id },
      select: { id: true, fullName: true, deletedAt: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
    }
    if (!row.deletedAt) {
      return NextResponse.json(
        { error: "Врач не помечен как удалённый" },
        { status: 400 },
      );
    }

    await prisma.doctor.update({
      where: { id },
      data: { deletedAt: null },
    });

    await recordContractorRevision(prisma, {
      kind: ContractorRevisionKind.RESTORE,
      doctorId: id,
      summary: `Врач «${row.fullName}» восстановлен`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/doctors/[id]/restore]", e);
    return NextResponse.json(
      { error: "Не удалось восстановить" },
      { status: 500 },
    );
  }
}
