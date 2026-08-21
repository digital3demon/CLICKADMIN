import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authStatusPublicJson } from "@/lib/auth/auth-status-public";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

/** Публично: нужен ли первый владелец. Численность пользователей не отдаём. */
export async function GET() {
  if (isSingleUserPortable()) {
    return NextResponse.json(authStatusPublicJson({ needsBootstrap: false, singleUser: true }));
  }
  try {
    const count = await prisma.user.count();
    return NextResponse.json(authStatusPublicJson({ needsBootstrap: count === 0 }));
  } catch {
    return NextResponse.json(
      { ...authStatusPublicJson({ needsBootstrap: true }), error: "db" },
      { status: 500 },
    );
  }
}
