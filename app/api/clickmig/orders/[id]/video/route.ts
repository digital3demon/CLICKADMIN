import { NextRequest, NextResponse } from "next/server";
import { CRM_UPLOAD_MAX_BYTES } from "@/lib/crm-upload-limits";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  isClickMigS3Enabled,
  newClickMigFileId,
  writeClickMigFileToDisk,
  writeClickMigFileToS3,
} from "@/lib/clickmig/storage.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const { id: orderId } = await params;
  const prisma = await getOrdersPrisma();

  const order = await prisma.clickMigOrder.findFirst({
    where: { id: orderId, tenantId },
  });
  if (!order) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0 || buf.length > CRM_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "Неверный размер файла" }, { status: 400 });
  }

  const fileName =
    decodeURIComponent(req.headers.get("x-upload-filename") ?? "video.mp4") ||
    "video.mp4";
  const mimeType = req.headers.get("x-upload-mime") ?? "video/mp4";
  const fileId = newClickMigFileId();

  let diskRelPath: string | null = null;
  if (isClickMigS3Enabled()) {
    diskRelPath = await writeClickMigFileToS3(tenantId, fileId, buf, mimeType);
  } else {
    diskRelPath = await writeClickMigFileToDisk(tenantId, fileId, buf);
  }

  await prisma.clickMigFile.create({
    data: {
      id: fileId,
      tenantId,
      orderId,
      applicationId: order.applicationId,
      kind: "VIDEO",
      fileName,
      mimeType,
      sizeBytes: buf.length,
      diskRelPath,
    },
  });

  await prisma.clickMigOrder.update({
    where: { id: orderId },
    data: { blockVideoFileId: fileId },
  });

  return NextResponse.json({ fileId, url: `/p/clickmig/video/${fileId}` });
}
