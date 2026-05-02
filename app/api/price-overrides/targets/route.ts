import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";

export async function GET() {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    const tenantId = await requireSessionTenantId(s);
    const prisma = await getPrisma();

    const [clinics, doctors] = await Promise.all([
      prisma.clinic.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.doctor.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      }),
    ]);

    return NextResponse.json({
      clinics: clinics.map((c) => ({ id: c.id, name: c.name })),
      doctors: doctors.map((d) => ({ id: d.id, name: d.fullName })),
    });
  } catch (e) {
    console.error("[GET /api/price-overrides/targets]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить контрагентов" },
      { status: 500 },
    );
  }
}
