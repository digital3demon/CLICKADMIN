import { ContractorRevisionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { ensureDoctorClinicLink } from "@/lib/ensure-doctor-clinic-link";
import { getPrisma } from "@/lib/get-prisma";
import { recordContractorRevision } from "@/lib/record-contractor-revision";
import { revalidateAfterDoctorClinicLinkChange } from "@/lib/revalidate-after-doctor-clinic-link";

/**
 * POST: привязать к клинике существующего врача (doctorId) или создать нового (fullName) и привязать.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id: clinicId } = await ctx.params;
    const cid = clinicId?.trim() ?? "";
    if (!cid) {
      return NextResponse.json({ error: "Некорректный id клиники" }, { status: 400 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: cid },
      select: { id: true, name: true, deletedAt: true, tenantId: true },
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

    const body = (await req.json()) as {
      doctorId?: unknown;
      fullName?: unknown;
    };
    const doctorIdRaw =
      typeof body.doctorId === "string" ? body.doctorId.trim() : "";
    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : "";

    if (doctorIdRaw && fullName) {
      return NextResponse.json(
        { error: "Укажите либо существующего врача (doctorId), либо ФИО нового" },
        { status: 400 },
      );
    }
    if (!doctorIdRaw && !fullName) {
      return NextResponse.json(
        { error: "Укажите врача из списка или ФИО нового врача" },
        { status: 400 },
      );
    }

    let doctorId = doctorIdRaw;

    if (fullName) {
      const d = await (await getPrisma()).doctor.create({
        data: {
          tenantId: clinic.tenantId,
          fullName,
          acceptsPrivatePractice: false,
        },
        select: { id: true, fullName: true },
      });
      doctorId = d.id;
      await recordContractorRevision(prisma, {
        kind: ContractorRevisionKind.CREATE,
        doctorId: d.id,
        summary: `Создан врач «${d.fullName}» (с карточки клиники «${clinic.name}»)`,
      });
    }

    const linked = await ensureDoctorClinicLink(prisma, doctorId, cid);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: 400 });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, fullName: true },
    });
    if (!doctor) {
      return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
    }

    await recordContractorRevision(prisma, {
      kind: ContractorRevisionKind.UPDATE,
      clinicId: cid,
      summary: `К клинике привязан врач «${doctor.fullName}»`,
    });

    revalidateAfterDoctorClinicLinkChange(cid, doctorId);

    return NextResponse.json({ ok: true, doctor });
  } catch (e) {
    console.error("[POST /api/clinics/[id]/doctor-links]", e);
    return NextResponse.json(
      { error: "Не удалось привязать врача" },
      { status: 500 },
    );
  }
}
