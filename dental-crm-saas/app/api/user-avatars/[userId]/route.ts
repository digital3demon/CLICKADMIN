import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { readUserAvatarFile } from "@/lib/user-custom-avatar";

type Ctx = { params: Promise<{ userId: string }> };

export const dynamic = "force-dynamic";

/** Аватар коллеги (для журнала профиля и т.п.): только для вошедших пользователей CRM. */
export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const { userId } = await ctx.params;
  if (!userId?.trim()) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const demo = Boolean(session.demo);
  const prisma = await getPrisma();
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarCustomMime: true, avatarCustomUploadedAt: true },
  });
  if (!row?.avatarCustomMime) {
    return NextResponse.json({ error: "Нет аватара" }, { status: 404 });
  }

  const buf = await readUserAvatarFile(userId, demo);
  if (!buf) {
    return NextResponse.json({ error: "Нет аватара" }, { status: 404 });
  }

  const res = new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": row.avatarCustomMime,
      "Cache-Control": "private, max-age=3600",
    },
  });
  if (row.avatarCustomUploadedAt) {
    res.headers.set("ETag", `"${row.avatarCustomUploadedAt.getTime()}"`);
  }
  return res;
}
