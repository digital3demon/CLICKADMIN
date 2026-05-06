import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { normalizeLabDueHmSlots } from "@/lib/lab-due-hm-slots";

export const dynamic = "force-dynamic";

function canEditTenantLabDueSlots(role: UserRole): boolean {
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
    select: { labDueHmSlots: true },
  });
  const slots = normalizeLabDueHmSlots(row?.labDueHmSlots ?? null);
  return NextResponse.json({ slots });
}

export async function PATCH(req: Request) {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canEditTenantLabDueSlots(s.role as UserRole)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const rawSlots = (body as { slots?: unknown }).slots;
  if (!Array.isArray(rawSlots)) {
    return NextResponse.json(
      { error: "Ожидается массив слотов времени" },
      { status: 400 },
    );
  }
  const normalized = normalizeLabDueHmSlots(rawSlots);
  if (normalized.length < 1) {
    return NextResponse.json(
      { error: "Нужен хотя бы один допустимый слот времени (HH:mm)" },
      { status: 400 },
    );
  }

  const tenantId = await requireSessionTenantId(s);
  const prisma = await getPrisma();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { labDueHmSlots: normalized },
  });

  return NextResponse.json({ ok: true, slots: normalized });
}
