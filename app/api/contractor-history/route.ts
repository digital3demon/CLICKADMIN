import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
/** Лента правок и список удалённых контрагентов для восстановления. */
export async function GET() {
  try {
    const [revisions, deletedClinics, deletedDoctors] = await Promise.all([
      (await getPrisma()).contractorRevision.findMany({
        orderBy: { createdAt: "desc" },
        take: 250,
        select: {
          id: true,
          createdAt: true,
          actorLabel: true,
          kind: true,
          summary: true,
          details: true,
          clinicId: true,
          doctorId: true,
        },
      }),
      (await getPrisma()).clinic.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        select: { id: true, name: true, deletedAt: true },
      }),
      (await getPrisma()).doctor.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        select: { id: true, fullName: true, deletedAt: true },
      }),
    ]);

    return NextResponse.json({
      revisions,
      deletedClinics,
      deletedDoctors,
    });
  } catch (e) {
    console.error("[GET /api/contractor-history]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить историю" },
      { status: 500 },
    );
  }
}
