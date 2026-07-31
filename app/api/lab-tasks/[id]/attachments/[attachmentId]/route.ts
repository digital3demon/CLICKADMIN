import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getPrisma } from "@/lib/get-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { session, access } = await getSessionWithModuleAccess();
    if (!session?.sub) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }
    if (access?.ORDERS !== true) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Нет организации" }, { status: 400 });
    }

    const { id, attachmentId } = await ctx.params;
    const prisma = await getPrisma();
    const row = await prisma.labTaskAttachment.findFirst({
      where: {
        id: attachmentId,
        taskId: id,
        task: { tenantId },
      },
      select: {
        fileName: true,
        mimeType: true,
        data: true,
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    const bytes = new Uint8Array(row.data);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("[lab-tasks/attachment]", e);
    return NextResponse.json({ error: "Ошибка чтения файла" }, { status: 500 });
  }
}
