import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s) {
    return NextResponse.json({ user: null, singleUser: isSingleUserPortable() });
  }

  let avatarPresetId: string | null = null;
  let mentionHandle: string | null = null;
  let avatarCustomUploadedAt: string | null = null;
  try {
    const db = await getPrisma();
    const row = await db.user.findUnique({
      where: { id: s.sub },
      select: {
        avatarPresetId: true,
        mentionHandle: true,
        avatarCustomUploadedAt: true,
      },
    });
    avatarPresetId = row?.avatarPresetId ?? null;
    mentionHandle = row?.mentionHandle ?? null;
    avatarCustomUploadedAt = row?.avatarCustomUploadedAt?.toISOString() ?? null;
  } catch {
    /* prisma / колонки — игнорируем, сессия всё равно валидна */
  }

  return NextResponse.json({
    user: {
      id: s.sub,
      email: s.email,
      displayName: s.name,
      role: s.role,
      avatarPresetId,
      mentionHandle,
      avatarCustomUploadedAt,
    },
    singleUser: isSingleUserPortable(),
    demo: Boolean(s.demo),
  });
}
