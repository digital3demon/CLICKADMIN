import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { clampOrderArchiveRetentionDays } from "@/lib/order-archive-retention";

export const dynamic = "force-dynamic";

function canEdit(role: UserRole): boolean {
  return (
    role === "OWNER" ||
    role === "SENIOR_ADMINISTRATOR" ||
    role === "ADMINISTRATOR"
  );
}

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(s);
  const prisma = await getPrisma();
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { orderArchiveRetentionDays: true },
  });
  return NextResponse.json({
    retentionDays: clampOrderArchiveRetentionDays(row?.orderArchiveRetentionDays),
  });
}

export async function PATCH(req: Request) {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canEdit(s.role as UserRole)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const raw = (body as { retentionDays?: unknown }).retentionDays;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return NextResponse.json(
      { error: "retentionDays должен быть числом (дни)" },
      { status: 400 },
    );
  }
  const retentionDays = clampOrderArchiveRetentionDays(raw);
  const tenantId = await requireSessionTenantId(s);
  const prisma = await getPrisma();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { orderArchiveRetentionDays: retentionDays },
  });
  return NextResponse.json({ ok: true, retentionDays });
}
