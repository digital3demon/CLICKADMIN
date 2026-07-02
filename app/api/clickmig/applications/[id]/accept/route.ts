import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { acceptClickMigApplication } from "@/lib/clickmig/accept-application.server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const { id } = await params;
  const prisma = await getOrdersPrisma();

  try {
    const result = await acceptClickMigApplication(
      prisma,
      tenantId,
      id,
      session.sub,
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    const status =
      msg === "APPLICATION_NOT_FOUND"
        ? 404
        : msg === "APPLICATION_NOT_PENDING" || msg === "ORDER_ALREADY_EXISTS"
          ? 409
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
