import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

/** Публично: есть ли пользователи (для первого входа / bootstrap). */
export async function GET() {
  if (isSingleUserPortable()) {
    return NextResponse.json({
      userCount: 1,
      needsBootstrap: false,
      singleUser: true,
    });
  }
  try {
    const count = await prisma.user.count();

    return NextResponse.json({
      userCount: count,
      needsBootstrap: count === 0,
    });
  } catch {
    return NextResponse.json(
      { userCount: 0, needsBootstrap: true, error: "db" },
      { status: 500 },
    );
  }
}
