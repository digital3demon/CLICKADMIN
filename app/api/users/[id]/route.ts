import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { canChangeUserRoles, canManageUsers } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";
import { parseUserRole } from "@/lib/user-role-labels";
import { payrollStaffRoleRequiredForRole } from "@/lib/payroll-staff-roles";
import { deleteUserAvatarFile } from "@/lib/user-custom-avatar";
import { userInTenantWhere } from "@/lib/auth/user-in-tenant";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = {
  isActive?: boolean;
  role?: unknown;
  payrollStaffRoleId?: unknown;
};

async function otherOwnerCount(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  excludeId: string,
  tenantId: string,
) {
  return prisma.user.count({
    where: { role: "OWNER", tenantId, id: { not: excludeId } },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { session: s, access } = await getSessionWithModuleAccess();
  if (!s || !canManageUsers(s.role, access ?? undefined)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const hasActive = typeof body.isActive === "boolean";
  const newRole = body.role !== undefined ? parseUserRole(body.role) : undefined;
  const hasRole = body.role !== undefined;
  const hasStaffRole = body.payrollStaffRoleId !== undefined;
  const newStaffRoleId = hasStaffRole
    ? body.payrollStaffRoleId === null
      ? null
      : typeof body.payrollStaffRoleId === "string"
        ? body.payrollStaffRoleId.trim() || null
        : null
    : undefined;

  if (!hasActive && !hasRole && !hasStaffRole) {
    return NextResponse.json(
      { error: "Ожидается isActive, role и/или payrollStaffRoleId" },
      { status: 400 },
    );
  }
  if (hasRole && newRole == null) {
    return NextResponse.json({ error: "Некорректная роль" }, { status: 400 });
  }
  if ((hasRole || hasStaffRole) && !canChangeUserRoles(s.role)) {
    return NextResponse.json(
      { error: "Смена роли доступна только владельцу" },
      { status: 403 },
    );
  }

  const where = userInTenantWhere(id, s.tid);
  if (!where) {
    return NextResponse.json({ error: "Нет организации в сессии" }, { status: 403 });
  }

  const prisma = await getPrisma();
  const target = await prisma.user.findFirst({
    where,
    select: { id: true, role: true, payrollStaffRoleId: true, isActive: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  if (hasActive && !body.isActive && id === s.sub) {
    return NextResponse.json(
      { error: "Нельзя отключить самого себя" },
      { status: 400 },
    );
  }

  if (hasActive && !body.isActive && target.role === "OWNER") {
    const otherActiveOwners = await prisma.user.count({
      where: {
        role: "OWNER",
        tenantId: where.tenantId,
        isActive: true,
        id: { not: id },
      },
    });
    if (otherActiveOwners < 1) {
      return NextResponse.json(
        { error: "Нельзя отключить последнего активного владельца" },
        { status: 400 },
      );
    }
  }

  if (hasRole && newRole != null && newRole !== target.role) {
    if (target.role === "OWNER" && newRole !== "OWNER") {
      if ((await otherOwnerCount(prisma, id, where.tenantId)) < 1) {
        return NextResponse.json(
          {
            error:
              "Нельзя снять роль владельца с последнего пользователя с ролью «Владелец»",
          },
          { status: 400 },
        );
      }
    }
    if (id === s.sub && target.role === "OWNER" && newRole !== "OWNER") {
      if ((await otherOwnerCount(prisma, id, where.tenantId)) < 1) {
        return NextResponse.json(
          { error: "Нельзя сменить себе роль: вы единственный владелец" },
          { status: 400 },
        );
      }
    }
  }

  if (newStaffRoleId) {
    const roleOk = await prisma.payrollStaffRole.findFirst({
      where: { id: newStaffRoleId, tenantId: where.tenantId },
      select: { id: true },
    });
    if (!roleOk) {
      return NextResponse.json({ error: "Роль ФОТ не найдена" }, { status: 400 });
    }
  }

  const effectiveRole = hasRole && newRole != null ? newRole : target.role;
  if (payrollStaffRoleRequiredForRole(effectiveRole)) {
    const staffAfter =
      hasStaffRole && newStaffRoleId !== undefined
        ? newStaffRoleId
        : hasRole
          ? null
          : target.payrollStaffRoleId;
    if (!staffAfter) {
      return NextResponse.json(
        { error: "Для роли «Пользователь» укажите роль сотрудника ФОТ" },
        { status: 400 },
      );
    }
  }

  const data: {
    isActive?: boolean;
    role?: UserRole;
    payrollStaffRoleId?: string | null;
  } = {};
  if (hasActive) data.isActive = body.isActive;
  if (hasRole && newRole != null) {
    data.role = newRole;
    if (!payrollStaffRoleRequiredForRole(newRole)) {
      data.payrollStaffRoleId = null;
    }
  }
  if (hasStaffRole && newStaffRoleId !== undefined) {
    data.payrollStaffRoleId = newStaffRoleId;
  } else if (
    hasRole &&
    newRole != null &&
    payrollStaffRoleRequiredForRole(newRole)
  ) {
    return NextResponse.json(
      { error: "При смене на роль «Пользователь» укажите роль сотрудника ФОТ" },
      { status: 400 },
    );
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет изменений" }, { status: 400 });
  }

  const updated = await prisma.user.updateMany({ where, data });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { session: s, access } = await getSessionWithModuleAccess();
  if (!s || !canManageUsers(s.role, access ?? undefined)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  if (id === s.sub) {
    return NextResponse.json({ error: "Нельзя удалить самого себя" }, { status: 400 });
  }

  const where = userInTenantWhere(id, s.tid);
  if (!where) {
    return NextResponse.json({ error: "Нет организации в сессии" }, { status: 403 });
  }

  const prisma = await getPrisma();
  const target = await prisma.user.findFirst({
    where,
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  if (target.role === "OWNER" && (await otherOwnerCount(prisma, id, where.tenantId)) < 1) {
    return NextResponse.json(
      { error: "Нельзя удалить последнего пользователя с ролью «Владелец»" },
      { status: 400 },
    );
  }

  const demo = Boolean(s.demo);
  await deleteUserAvatarFile(id, demo);
  const deleted = await prisma.user.deleteMany({ where });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
