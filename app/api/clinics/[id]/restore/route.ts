import { ContractorRevisionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { recordContractorRevision } from "@/lib/record-contractor-revision";

/** Восстановление мягко удалённой клиники. */
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

    const row = await prisma.clinic.findUnique({
      where: { id },
      select: { id: true, name: true, deletedAt: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
    }
    if (!row.deletedAt) {
      return NextResponse.json(
        { error: "Клиника не помечена как удалённая" },
        { status: 400 },
      );
    }

    await prisma.clinic.update({
      where: { id },
      data: { deletedAt: null },
    });

    const label = row.name.split("\n")[0]?.trim() || row.name;
    await recordContractorRevision(prisma, {
      kind: ContractorRevisionKind.RESTORE,
      clinicId: id,
      summary: `Клиника «${label}» восстановлена`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/clinics/[id]/restore]", e);
    return NextResponse.json(
      { error: "Не удалось восстановить" },
      { status: 500 },
    );
  }
}
