import { ContractorRevisionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { recordContractorRevision } from "@/lib/record-contractor-revision";
import { revalidateAfterDoctorClinicLinkChange } from "@/lib/revalidate-after-doctor-clinic-link";

/**
 * Удаляет связь врач ↔ клиника и фиксирует подавление, чтобы repair по нарядам не вернул связь.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; doctorId: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id: clinicId, doctorId } = await ctx.params;
    const cid = clinicId?.trim() ?? "";
    const did = doctorId?.trim() ?? "";
    if (!cid || !did) {
      return NextResponse.json({ error: "Некорректные id" }, { status: 400 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: cid },
      select: { id: true, name: true, deletedAt: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
    }
    if (clinic.deletedAt) {
      return NextResponse.json(
        { error: "Клиника удалена — сначала восстановите запись" },
        { status: 400 },
      );
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: did },
      select: { id: true, fullName: true, deletedAt: true },
    });
    if (!doctor) {
      return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
    }
    if (doctor.deletedAt) {
      return NextResponse.json(
        { error: "Врач удалён — сначала восстановите запись" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.doctorOnClinic.deleteMany({
        where: { clinicId: cid, doctorId: did },
      }),
      prisma.doctorClinicLinkSuppression.upsert({
        where: {
          doctorId_clinicId: { doctorId: did, clinicId: cid },
        },
        create: { doctorId: did, clinicId: cid },
        update: {},
      }),
    ]);

    await recordContractorRevision(prisma, {
      kind: ContractorRevisionKind.UPDATE,
      clinicId: cid,
      summary: `Отвязан врач «${doctor.fullName}» от клиники (связь в старых нарядах сохраняется)`,
    });

    revalidateAfterDoctorClinicLinkChange(cid, did);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE clinic doctor-link]", e);
    return NextResponse.json(
      { error: "Не удалось убрать связь" },
      { status: 500 },
    );
  }
}
