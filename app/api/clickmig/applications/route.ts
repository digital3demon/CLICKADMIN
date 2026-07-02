import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { clickMigMaterialLabel } from "@/lib/clickmig/material-labels";
import { getClickMigConfig } from "@/lib/clickmig/config.server";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getOrdersPrisma();

  const apps = await prisma.clickMigApplication.findMany({
    where: { tenantId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      files: { select: { kind: true } },
      client: { select: { fullName: true, email: true } },
    },
  });

  const { json: config } = await getClickMigConfig(prisma, tenantId);

  return NextResponse.json({
    applications: apps.map((a) => {
      const ct = config.constructionTypes.find((c) => c.key === a.constructionTypeKey);
      const hasPhoto =
        (Array.isArray(a.photoLinks) && (a.photoLinks as string[]).length > 0) ||
        a.files.some((f) => f.kind === "PHOTO");
      const hasScans =
        (Array.isArray(a.scanLinks) && (a.scanLinks as string[]).length > 0) ||
        a.files.some((f) => f.kind === "SCAN");
      return {
        id: a.id,
        publicNumber: a.publicNumber,
        createdAt: a.createdAt.toISOString(),
        doctorName: a.client?.fullName ?? a.guestDoctorName ?? "—",
        doctorEmail: a.client?.email ?? a.guestEmail ?? "",
        patientName: a.patientName,
        material: a.material,
        materialLabel: clickMigMaterialLabel(a.material),
        constructionTypeKey: a.constructionTypeKey,
        constructionName: ct?.name ?? a.constructionTypeKey,
        shadeCode: a.shadeCode,
        shadeDetail: a.shadeDetail,
        hasPhoto,
        hasScans,
        status: a.status,
      };
    }),
  });
}
