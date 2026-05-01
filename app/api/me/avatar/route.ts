import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { dbRequestUserHint } from "@/lib/db-request-error-hint";
import { getPrisma } from "@/lib/get-prisma";
import {
  deleteUserAvatarFile,
  readUserAvatarFile,
  writeUserAvatarFile,
} from "@/lib/user-custom-avatar";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session?.sub) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const demo = Boolean(session.demo);
    const prisma = await getPrisma();
    const row = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { avatarCustomMime: true, avatarCustomUploadedAt: true },
    });
    if (!row?.avatarCustomMime) {
      return NextResponse.json({ error: "Нет аватара" }, { status: 404 });
    }

    const buf = await readUserAvatarFile(session.sub, demo);
    if (!buf) {
      /** После деплоя на PaaS каталог data/ часто пустой — в БД ещё есть MIME, файл уже не на диске. */
      try {
        await prisma.user.update({
          where: { id: session.sub },
          data: { avatarCustomMime: null, avatarCustomUploadedAt: null },
        });
      } catch (e) {
        console.warn("[me/avatar] GET clear stale avatar fields", e);
      }
      return NextResponse.json(
        { error: "Файл фото на диске не найден. Загрузите снимок снова." },
        { status: 404 },
      );
    }

    const res = new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": row.avatarCustomMime,
        "Cache-Control": "private, no-store",
      },
    });
    if (row.avatarCustomUploadedAt) {
      res.headers.set("ETag", `"${row.avatarCustomUploadedAt.getTime()}"`);
    }
    return res;
  } catch (e) {
    console.error("[me/avatar] GET", e);
    return NextResponse.json(
      {
        error: dbRequestUserHint(
          e,
          "Не удалось отдать фото профиля. Проверьте логи сервера.",
        ),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const demo = Boolean(session.demo);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ожидается multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Поле file обязательно" }, { status: 400 });
  }

  let ab: ArrayBuffer;
  try {
    ab = await file.arrayBuffer();
  } catch (e) {
    console.error("[me/avatar] POST read body", e);
    return NextResponse.json(
      { error: "Не удалось прочитать файл загрузки." },
      { status: 400 },
    );
  }
  const buf = Buffer.from(ab);

  let written: Awaited<ReturnType<typeof writeUserAvatarFile>>;
  try {
    written = await writeUserAvatarFile(session.sub, demo, buf);
  } catch (e) {
    console.error("[me/avatar] POST disk", e);
    return NextResponse.json(
      {
        error: dbRequestUserHint(
          e,
          "Не удалось сохранить файл на диск. Проверьте каталог data/user-avatars и права.",
        ),
      },
      { status: 500 },
    );
  }
  if ("error" in written) {
    return NextResponse.json({ error: written.error }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const now = new Date();
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: {
        avatarCustomMime: written.mime,
        avatarCustomUploadedAt: now,
      },
      select: {
        id: true,
        avatarPresetId: true,
        avatarCustomMime: true,
        avatarCustomUploadedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        avatarPresetId: user.avatarPresetId,
        avatarCustomMime: user.avatarCustomMime,
        avatarCustomUploadedAt: user.avatarCustomUploadedAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    console.error("[me/avatar] POST prisma", e);
    try {
      await deleteUserAvatarFile(session.sub, demo);
    } catch (delErr) {
      console.error("[me/avatar] POST rollback file", delErr);
    }
    return NextResponse.json(
      {
        error: dbRequestUserHint(
          e,
          "Не удалось записать данные аватара в базу. Проверьте миграции Prisma.",
        ),
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSessionFromCookies();
    if (!session?.sub) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const demo = Boolean(session.demo);
    await deleteUserAvatarFile(session.sub, demo);

    const prisma = await getPrisma();
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: { avatarCustomMime: null, avatarCustomUploadedAt: null },
      select: {
        id: true,
        avatarPresetId: true,
        avatarCustomMime: true,
        avatarCustomUploadedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        avatarPresetId: user.avatarPresetId,
        avatarCustomMime: user.avatarCustomMime,
        avatarCustomUploadedAt: user.avatarCustomUploadedAt,
      },
    });
  } catch (e) {
    console.error("[me/avatar] DELETE", e);
    return NextResponse.json(
      {
        error: dbRequestUserHint(
          e,
          "Не удалось удалить фото профиля. Проверьте логи сервера.",
        ),
      },
      { status: 500 },
    );
  }
}
