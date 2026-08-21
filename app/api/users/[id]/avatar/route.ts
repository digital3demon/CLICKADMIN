import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getPrisma } from "@/lib/get-prisma";
import { readUserCustomAvatarBuffer } from "@/lib/user-custom-avatar";
import { userInTenantWhere } from "@/lib/auth/user-in-tenant";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/** Кастомный аватар коллеги (для канбана и др.): только для вошедших пользователей CRM. */
export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const where = userInTenantWhere(id, session.tid);
  if (!where) {
    return NextResponse.json({ error: "Нет организации в сессии" }, { status: 403 });
  }

  const demo = Boolean(session.demo);
  const prisma = await getPrisma();
  const row = await prisma.user.findFirst({
    where,
    select: {
      id: true,
      avatarCustomMime: true,
      avatarCustomUploadedAt: true,
      avatarCustomData: true,
      isActive: true,
    },
  });
  if (!row?.avatarCustomMime || !row.isActive) {
    return NextResponse.json({ error: "Нет аватара" }, { status: 404 });
  }

  const buf = await readUserCustomAvatarBuffer(id, demo, row);
  if (!buf) {
    try {
      await prisma.user.updateMany({
        where,
        data: {
          avatarCustomMime: null,
          avatarCustomUploadedAt: null,
          avatarCustomData: null,
        },
      });
    } catch (e) {
      console.warn("[users/avatar] GET clear stale avatar fields", e);
    }
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
