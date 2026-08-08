import { NextResponse } from "next/server";
import { canAcceptOrderChatCorrections } from "@/lib/auth/permissions";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getPrisma } from "@/lib/get-prisma";
import {
  isAllowedLabTaskImageMime,
  LAB_TASK_MAX_ATTACHMENT_BYTES,
  LAB_TASK_MAX_ATTACHMENTS,
  LAB_TASK_MAX_TEXT_LEN,
  parseLabTaskKindParam,
} from "@/lib/lab-tasks";
import {
  countPendingLabTasks,
  loadLabTasks,
} from "@/lib/lab-tasks.server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { userPersonDisplayName } from "@/lib/user-activity-display-label";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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
      return NextResponse.json(
        { error: "Не задана организация для сессии" },
        { status: 400 },
      );
    }

    const url = new URL(req.url);
    const kind = parseLabTaskKindParam(url.searchParams.get("kind"));
    if (url.searchParams.get("countOnly") === "1") {
      const pendingCount = await countPendingLabTasks(tenantId, kind);
      return NextResponse.json(
        { pendingCount, kind },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const statusRaw = url.searchParams.get("status");
    const status = statusRaw === "all" ? "all" : "pending";
    const items = await loadLabTasks({
      tenantId,
      kind,
      status,
      limit: status === "all" ? 80 : 100,
    });

    return NextResponse.json(
      {
        kind,
        pendingCount: await countPendingLabTasks(tenantId, kind),
        canResolve: canAcceptOrderChatCorrections(session.role),
        items,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[lab-tasks] GET", e);
    return NextResponse.json(
      { error: "Не удалось загрузить" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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
      return NextResponse.json(
        { error: "Не задана организация для сессии" },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const kind = parseLabTaskKindParam(
      typeof form.get("kind") === "string" ? String(form.get("kind")) : null,
    );
    const text = String(form.get("text") ?? "").trim().slice(0, LAB_TASK_MAX_TEXT_LEN);
    const files = form
      .getAll("files")
      .filter((x): x is File => typeof File !== "undefined" && x instanceof File);

    if (!text && files.length === 0) {
      return NextResponse.json(
        { error: "Введите текст или прикрепите картинку" },
        { status: 400 },
      );
    }
    if (files.length > LAB_TASK_MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `Не больше ${LAB_TASK_MAX_ATTACHMENTS} файлов` },
        { status: 400 },
      );
    }

    const prepared: {
      fileName: string;
      mimeType: string;
      size: number;
      data: Buffer;
    }[] = [];

    for (const file of files) {
      const mime = (file.type || "application/octet-stream").trim();
      if (!isAllowedLabTaskImageMime(mime)) {
        return NextResponse.json(
          { error: `Неподдерживаемый тип файла: ${file.name || mime}` },
          { status: 400 },
        );
      }
      if (file.size > LAB_TASK_MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          {
            error: `Файл слишком большой (макс. ${LAB_TASK_MAX_ATTACHMENT_BYTES / (1024 * 1024)} МБ)`,
          },
          { status: 400 },
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      prepared.push({
        fileName: (file.name || "image.png").slice(0, 180),
        mimeType: mime === "image/jpg" ? "image/jpeg" : mime,
        size: buf.length,
        data: buf,
      });
    }

    const prisma = await getPrisma();
    const author = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { displayName: true, email: true, mentionHandle: true },
    });
    const authorLabel = author
      ? userPersonDisplayName(author)
      : (session.name || session.email?.split("@")[0] || "Пользователь").trim();

    const created = await prisma.labTask.create({
      data: {
        tenantId,
        kind,
        text,
        authorUserId: session.sub,
        authorLabel,
      },
      select: { id: true },
    });

    if (prepared.length > 0) {
      for (const p of prepared) {
        await prisma.labTaskAttachment.create({
          data: {
            taskId: created.id,
            fileName: p.fileName,
            mimeType: p.mimeType,
            size: p.size,
            // Prisma Bytes ↔ TS 5.x Uint8Array generic variance
            data: Buffer.from(p.data) as unknown as Uint8Array<ArrayBuffer>,
          },
        });
      }
    }

    const items = await loadLabTasks({ tenantId, kind, status: "pending" });
    return NextResponse.json({
      ok: true,
      id: created.id,
      kind,
      pendingCount: await countPendingLabTasks(tenantId, kind),
      items,
    });
  } catch (e) {
    console.error("[lab-tasks] POST", e);
    return NextResponse.json(
      { error: "Не удалось создать запись" },
      { status: 500 },
    );
  }
}
