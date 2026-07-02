import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getClickMigConfig } from "@/lib/clickmig/config.server";
import { clickMigMaterialLabel } from "@/lib/clickmig/material-labels";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const { id } = await params;
  const prisma = await getOrdersPrisma();

  const app = await prisma.clickMigApplication.findFirst({
    where: { id, tenantId },
    include: {
      files: true,
      client: true,
      order: true,
    },
  });
  if (!app) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const { json: config } = await getClickMigConfig(prisma, tenantId);
  const ct = config.constructionTypes.find((c) => c.key === app.constructionTypeKey);

  return NextResponse.json({
    application: {
      ...app,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      rejectedAt: app.rejectedAt?.toISOString() ?? null,
      teethFdi: app.teethFdi as string[],
      photoLinks: (app.photoLinks as string[] | null) ?? [],
      scanLinks: (app.scanLinks as string[] | null) ?? [],
      materialLabel: clickMigMaterialLabel(app.material),
      constructionName: ct?.name ?? app.constructionTypeKey,
      files: app.files.map((f) => ({
        id: f.id,
        kind: f.kind,
        fileName: f.fileName,
        mimeType: f.mimeType,
        url: `/api/clickmig/files/${f.id}?inline=1`,
      })),
    },
  });
}
