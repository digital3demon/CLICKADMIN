import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { canChangeUserRoles, canManageUsers } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";
import { parseUserRole } from "@/lib/user-role-labels";
import { deleteUserAvatarFile } from "@/lib/user-custom-avatar";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = { isActive?: boolean; role?: unknown };

async function otherOwnerCount(prisma: Awaited<ReturnType<typeof getPrisma>>, excludeId: string) {
  return prisma.user.count({
    where: { role: "OWNER", id: { not: excludeId } },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const s = await getSessionFromCookies();
  if (!s || !canManageUsers(s.role)) {
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
  const newRole =
    body.role !== undefined ? parseUserRole(body.role) : undefined;
  const hasRole = body.role !== undefined;

  if (!hasActive && !hasRole) {
    return NextResponse.json(
      { error: "Ожидается isActive и/или role" },
      { status: 400 },
    );
  }
  if (hasRole && newRole == null) {
    return NextResponse.json({ error: "Некорректная роль" }, { status: 400 });
  }
  if (hasRole && !canChangeUserRoles(s.role)) {
    return NextResponse.json(
      { error: "Смена роли доступна только владельцу" },
      { status: 403 },
    );
  }

  const prisma = await getPrisma();
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true },
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
      if ((await otherOwnerCount(prisma, id)) < 1) {
        return NextResponse.json(
          { error: "Нельзя снять роль владельца с последнего пользователя с ролью «Владелец»" },
          { status: 400 },
        );
      }
    }
    if (id === s.sub && target.role === "OWNER" && newRole !== "OWNER") {
      if ((await otherOwnerCount(prisma, id)) < 1) {
        return NextResponse.json(
          { error: "Нельзя сменить себе роль: вы единственный владелец" },
          { status: 400 },
        );
      }
    }
  }

  const data: { isActive?: boolean; role?: UserRole } = {};
  if (hasActive) data.isActive = body.isActive;
  if (hasRole && newRole != null) data.role = newRole;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет изменений" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const s = await getSessionFromCookies();
  if (!s || !canManageUsers(s.role)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  if (id === s.sub) {
    return NextResponse.json({ error: "Нельзя удалить самого себя" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  if (target.role === "OWNER" && (await otherOwnerCount(prisma, id)) < 1) {
    return NextResponse.json(
      { error: "Нельзя удалить последнего пользователя с ролью «Владелец»" },
      { status: 400 },
    );
  }

  const demo = Boolean(s.demo);
  await deleteUserAvatarFile(id, demo);
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
