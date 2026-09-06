import "server-only";
import type { AppModule, PrismaClient } from "@prisma/client";
import {
  ALL_APP_MODULES,
  defaultModuleAllowed,
} from "@/lib/role-module-defaults";
import { DEFAULT_PAYROLL_STAFF_ROLE_SEEDS } from "@/lib/payroll-staff-roles";

/** Создать строки матрицы доступов для staff role = дефолты USER. */
export async function seedStaffRoleModuleAccess(
  db: PrismaClient,
  tenantId: string,
  staffRoleId: string,
): Promise<void> {
  await db.staffRoleModuleAccess.createMany({
    data: ALL_APP_MODULES.map((module) => ({
      tenantId,
      staffRoleId,
      module,
      allowed: defaultModuleAllowed("USER", module),
    })),
    skipDuplicates: true,
  });
}

export async function ensureDefaultPayrollStaffRoles(
  db: PrismaClient,
  tenantId: string,
): Promise<void> {
  const existing = await db.payrollStaffRole.findMany({
    where: { tenantId },
    select: { id: true, name: true, _count: { select: { moduleAccess: true } } },
  });
  const byName = new Map(existing.map((r) => [r.name, r]));
  for (const seed of DEFAULT_PAYROLL_STAFF_ROLE_SEEDS) {
    if (byName.has(seed.name)) continue;
    const created = await db.payrollStaffRole.create({
      data: {
        tenantId,
        name: seed.name,
        sortOrder: seed.sortOrder,
      },
      select: { id: true },
    });
    await seedStaffRoleModuleAccess(db, tenantId, created.id);
  }
  for (const role of existing) {
    if (role._count.moduleAccess === 0) {
      await seedStaffRoleModuleAccess(db, tenantId, role.id);
    }
  }
}

export async function createPayrollStaffRole(
  db: PrismaClient,
  tenantId: string,
  name: string,
  sortOrder?: number,
): Promise<{ id: string; name: string; sortOrder: number }> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Укажите название роли");
  const maxSort = await db.payrollStaffRole.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });
  const created = await db.payrollStaffRole.create({
    data: {
      tenantId,
      name: trimmed,
      sortOrder: sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10,
    },
    select: { id: true, name: true, sortOrder: true },
  });
  await seedStaffRoleModuleAccess(db, tenantId, created.id);
  return created;
}

export async function deletePayrollStaffRole(
  db: PrismaClient,
  tenantId: string,
  staffRoleId: string,
): Promise<{ ok: true } | { error: string; status: number }> {
  const role = await db.payrollStaffRole.findFirst({
    where: { id: staffRoleId, tenantId },
    select: { id: true },
  });
  if (!role) return { error: "Роль не найдена", status: 404 };

  const [userCount, fotCount] = await Promise.all([
    db.user.count({ where: { tenantId, payrollStaffRoleId: staffRoleId } }),
    db.payrollConfigStaffRole.count({ where: { staffRoleId } }),
  ]);
  if (userCount > 0) {
    return {
      error: `Нельзя удалить: роль назначена ${userCount} пользователям`,
      status: 409,
    };
  }
  if (fotCount > 0) {
    return {
      error: `Нельзя удалить: к роли привязано ${fotCount} ФОТ`,
      status: 409,
    };
  }

  await db.payrollStaffRole.delete({ where: { id: staffRoleId } });
  return { ok: true };
}

export async function getEffectiveModuleAccessForStaffRole(
  db: PrismaClient,
  tenantId: string,
  staffRoleId: string,
  baseFromUserRole: Record<AppModule, boolean>,
): Promise<Record<AppModule, boolean>> {
  const rows = await db.staffRoleModuleAccess.findMany({
    where: { tenantId, staffRoleId },
    select: { module: true, allowed: true },
  });
  if (rows.length === 0) return baseFromUserRole;
  const fromDb = new Map(rows.map((r) => [r.module, r.allowed]));
  const out = { ...baseFromUserRole };
  for (const m of ALL_APP_MODULES) {
    if (fromDb.has(m)) out[m] = fromDb.get(m)!;
  }
  return out;
}
