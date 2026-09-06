import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { canConfigurePayroll } from "@/lib/payroll";
import {
  createPayrollStaffRole,
  deletePayrollStaffRole,
  ensureDefaultPayrollStaffRoles,
} from "@/lib/payroll-staff-roles.server";

export const dynamic = "force-dynamic";

async function requireOwner() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return { error: NextResponse.json({ error: "Требуется вход" }, { status: 401 }) };
  }
  if (!canConfigurePayroll(session.role)) {
    return { error: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();
  return { session, tenantId, prisma };
}

export async function GET() {
  const access = await requireOwner();
  if ("error" in access) return access.error;
  await ensureDefaultPayrollStaffRoles(access.prisma, access.tenantId);
  const roles = await access.prisma.payrollStaffRole.findMany({
    where: { tenantId: access.tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      _count: { select: { configLinks: true, users: true } },
    },
  });
  return NextResponse.json(
    {
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        sortOrder: r.sortOrder,
        fotCount: r._count.configLinks,
        userCount: r._count.users,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(req: Request) {
  const access = await requireOwner();
  if ("error" in access) return access.error;
  let body: { name?: unknown; sortOrder?: unknown };
  try {
    body = (await req.json()) as { name?: unknown; sortOrder?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Укажите название роли" }, { status: 400 });
  }
  try {
    const role = await createPayrollStaffRole(
      access.prisma,
      access.tenantId,
      name,
      typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    );
    return NextResponse.json({ ok: true, role });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Не удалось создать роль";
    if (msg.includes("Unique") || msg.includes("unique")) {
      return NextResponse.json({ error: "Роль с таким именем уже есть" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const access = await requireOwner();
  if ("error" in access) return access.error;
  let body: { id?: unknown; name?: unknown; sortOrder?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; name?: unknown; sortOrder?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Ожидается id" }, { status: 400 });
  const existing = await access.prisma.payrollStaffRole.findFirst({
    where: { id, tenantId: access.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Роль не найдена" }, { status: 404 });
  }
  const data: { name?: string; sortOrder?: number } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.round(body.sortOrder);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет изменений" }, { status: 400 });
  }
  try {
    const role = await access.prisma.payrollStaffRole.update({
      where: { id },
      data,
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json({ ok: true, role });
  } catch {
    return NextResponse.json({ error: "Роль с таким именем уже есть" }, { status: 409 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireOwner();
  if ("error" in access) return access.error;
  let body: { id?: unknown };
  try {
    body = (await req.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Ожидается id" }, { status: 400 });
  const result = await deletePayrollStaffRole(access.prisma, access.tenantId, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
