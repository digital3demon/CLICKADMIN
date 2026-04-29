import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getPrisma } from "@/lib/get-prisma";
import {
  deleteUserAvatarFile,
  readUserAvatarFile,
  writeUserAvatarFile,
} from "@/lib/user-custom-avatar";

export const dynamic = "force-dynamic";

export async function GET() {
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
    return NextResponse.json({ error: "Нет аватара" }, { status: 404 });
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

  const ab = await file.arrayBuffer();
  const buf = Buffer.from(ab);
  const written = await writeUserAvatarFile(session.sub, demo, buf);
  if ("error" in written) {
    return NextResponse.json({ error: written.error }, { status: 400 });
  }

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
}

export async function DELETE() {
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
}
