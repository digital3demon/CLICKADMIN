import { ContractorRevisionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { ensureDoctorClinicLink } from "@/lib/ensure-doctor-clinic-link";
import { getPrisma } from "@/lib/get-prisma";
import { recordContractorRevision } from "@/lib/record-contractor-revision";
import { revalidateAfterDoctorClinicLinkChange } from "@/lib/revalidate-after-doctor-clinic-link";

/**
 * POST: привязать врача к существующей клинике (clinicId) или создать клинику (name + address) и привязать.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id: doctorId } = await ctx.params;
    const did = doctorId?.trim() ?? "";
    if (!did) {
      return NextResponse.json({ error: "Некорректный id врача" }, { status: 400 });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: did },
      select: { id: true, fullName: true, deletedAt: true, tenantId: true },
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

    const body = (await req.json()) as {
      clinicId?: unknown;
      name?: unknown;
      address?: unknown;
    };
    const clinicIdRaw =
      typeof body.clinicId === "string" ? body.clinicId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const address =
      typeof body.address === "string" ? body.address.trim() : "";

    if (clinicIdRaw && name) {
      return NextResponse.json(
        {
          error:
            "Укажите либо существующую клинику (clinicId), либо название новой",
        },
        { status: 400 },
      );
    }
    if (!clinicIdRaw && !name) {
      return NextResponse.json(
        { error: "Укажите клинику из списка или название новой клиники" },
        { status: 400 },
      );
    }

    let clinicId = clinicIdRaw;
    let clinicNameForLog = "";

    if (name) {
      const c = await prisma.clinic.create({
        data: {
          tenantId: doctor.tenantId,
          name,
          address: address.length ? address : null,
        },
        select: { id: true, name: true },
      });
      clinicId = c.id;
      clinicNameForLog = c.name;
      await recordContractorRevision(prisma, {
        kind: ContractorRevisionKind.CREATE,
        clinicId: c.id,
        summary: `Создана клиника «${c.name}» (с карточки врача «${doctor.fullName}»)`,
      });
    } else {
      const c = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, deletedAt: true },
      });
      if (!c) {
        return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
      }
      if (c.deletedAt) {
        return NextResponse.json(
          { error: "Клиника удалена — сначала восстановите запись" },
          { status: 400 },
        );
      }
      clinicNameForLog = c.name;
    }

    const linked = await ensureDoctorClinicLink(prisma, did, clinicId);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: 400 });
    }

    await recordContractorRevision(prisma, {
      kind: ContractorRevisionKind.UPDATE,
      doctorId: did,
      summary: `Врач привязан к клинике «${clinicNameForLog}»`,
    });

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true, address: true },
    });

    revalidateAfterDoctorClinicLinkChange(clinicId, did);

    return NextResponse.json({ ok: true, clinic });
  } catch (e) {
    console.error("[POST /api/doctors/[id]/clinic-links]", e);
    return NextResponse.json(
      { error: "Не удалось привязать клинику" },
      { status: 500 },
    );
  }
}
