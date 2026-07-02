import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { readClickMigFileBytes } from "@/lib/clickmig/storage.server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const { id } = await params;
  const prisma = await getOrdersPrisma();

  const file = await prisma.clickMigFile.findFirst({
    where: { id, tenantId },
  });
  if (!file) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const bytes = await readClickMigFileBytes(
    file.diskRelPath,
    file.data ? Buffer.from(file.data) : null,
  );
  if (!bytes) {
    return NextResponse.json({ error: "Файл недоступен" }, { status: 404 });
  }

  const inline = new URL(req.url).searchParams.get("inline") === "1";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(file.fileName)}"`,
    },
  });
}
