import { NextResponse } from "next/server";
import type { AppModule, UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  ALL_APP_MODULES,
  bundlesForAccessMatrix,
  defaultModuleAllowed,
  isClickMigOwnerOnlyBundle,
  ROLES_IN_ACCESS_MATRIX,
} from "@/lib/role-module-defaults";
import {
  atomicModulesForBundleToggle,
  BUNDLE_LABELS,
  BUNDLE_MATRIX_GROUPS,
  childBundlesOf,
  collapseToBundles,
  isBundleId,
  requiredParentBundle,
  type BundleId,
} from "@/lib/role-module-bundles";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import { ensureDefaultPayrollStaffRoles } from "@/lib/payroll-staff-roles.server";

export const dynamic = "force-dynamic";

function bundleAccessForResponse(
  access: Record<AppModule, boolean>,
): Record<string, boolean> {
  const collapsed = collapseToBundles(access);
  return Object.fromEntries(
    bundlesForAccessMatrix().map((b) => [b, collapsed[b] === true]),
  );
}

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s || s.role !== "OWNER") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(s);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет организации" }, { status: 400 });
  }

  const prisma = await getPrisma();
  await ensureDefaultPayrollStaffRoles(prisma, tenantId);

  const effective: Record<string, Record<string, boolean>> = {};
  for (const role of ROLES_IN_ACCESS_MATRIX) {
    const acc = await getEffectiveModuleAccess(tenantId, role, { db: prisma });
    effective[role] = bundleAccessForResponse(acc);
  }

  const staffRoles = await prisma.payrollStaffRole.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  const staffEffective: Record<string, Record<string, boolean>> = {};
  for (const sr of staffRoles) {
    const acc = await getEffectiveModuleAccess(tenantId, "USER", {
      db: prisma,
      payrollStaffRoleId: sr.id,
    });
    staffEffective[sr.id] = bundleAccessForResponse(acc);
  }

  return NextResponse.json({
    bundles: bundlesForAccessMatrix().map((b) => ({
      id: b,
      label: BUNDLE_LABELS[b],
    })),
    groups: BUNDLE_MATRIX_GROUPS.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      bundles: g.bundles,
    })),
    roles: ROLES_IN_ACCESS_MATRIX,
    staffRoles,
    effective,
    staffEffective,
  });
}

type PutBody = {
  role?: UserRole;
  staffRoleId?: string;
  bundle?: BundleId;
  allowed?: boolean;
};

export async function PUT(req: Request) {
  const s = await getSessionFromCookies();
  if (!s || s.role !== "OWNER") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(s);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет организации" }, { status: 400 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const bundle = body.bundle;
  const staffRoleId =
    typeof body.staffRoleId === "string" ? body.staffRoleId.trim() : "";
  const role = body.role;

  if (bundle == null || typeof body.allowed !== "boolean" || !isBundleId(bundle)) {
    return NextResponse.json(
      { error: "Ожидается role или staffRoleId, bundle, allowed" },
      { status: 400 },
    );
  }
  if (isClickMigOwnerOnlyBundle(bundle)) {
    return NextResponse.json(
      {
        error:
          "КликМиг временно доступен только владельцу (OWNER); права других ролей не настраиваются.",
      },
      { status: 400 },
    );
  }

  const prisma = await getPrisma();

  if (staffRoleId) {
    const sr = await prisma.payrollStaffRole.findFirst({
      where: { id: staffRoleId, tenantId },
      select: { id: true },
    });
    if (!sr) {
      return NextResponse.json({ error: "Роль ФОТ не найдена" }, { status: 404 });
    }
    const accBefore = await getEffectiveModuleAccess(tenantId, "USER", {
      db: prisma,
      payrollStaffRoleId: staffRoleId,
    });
    const bundlesBefore = collapseToBundles(accBefore);
    if (body.allowed) {
      const parent = requiredParentBundle(bundle);
      if (parent && !bundlesBefore[parent]) {
        return NextResponse.json(
          { error: `Сначала включите «${BUNDLE_LABELS[parent]}» для этой роли.` },
          { status: 400 },
        );
      }
    } else {
      for (const child of childBundlesOf(bundle)) {
        if (bundlesBefore[child]) {
          return NextResponse.json(
            {
              error: `Сначала отключите «${BUNDLE_LABELS[child]}» для этой роли.`,
            },
            { status: 400 },
          );
        }
      }
    }
    const modulesToWrite = atomicModulesForBundleToggle(bundle);
    for (const module of modulesToWrite) {
      if (!ALL_APP_MODULES.includes(module)) continue;
      const def = defaultModuleAllowed("USER", module);
      if (body.allowed === def) {
        await prisma.staffRoleModuleAccess.deleteMany({
          where: { tenantId, staffRoleId, module },
        });
      } else {
        await prisma.staffRoleModuleAccess.upsert({
          where: {
            tenantId_staffRoleId_module: { tenantId, staffRoleId, module },
          },
          create: {
            tenantId,
            staffRoleId,
            module,
            allowed: body.allowed,
          },
          update: { allowed: body.allowed },
        });
      }
    }
    const accAfter = await getEffectiveModuleAccess(tenantId, "USER", {
      db: prisma,
      payrollStaffRoleId: staffRoleId,
    });
    return NextResponse.json({
      ok: true,
      staffRoleId,
      effective: bundleAccessForResponse(accAfter),
    });
  }

  if (role == null) {
    return NextResponse.json(
      { error: "Ожидается role или staffRoleId" },
      { status: 400 },
    );
  }
  if (role === "OWNER") {
    return NextResponse.json(
      { error: "Роль владельца не настраивается" },
      { status: 400 },
    );
  }
  if (!ROLES_IN_ACCESS_MATRIX.includes(role)) {
    return NextResponse.json({ error: "Некорректная роль" }, { status: 400 });
  }

  const accBefore = await getEffectiveModuleAccess(tenantId, role, { db: prisma });
  const bundlesBefore = collapseToBundles(accBefore);

  if (body.allowed) {
    const parent = requiredParentBundle(bundle);
    if (parent && !bundlesBefore[parent]) {
      return NextResponse.json(
        { error: `Сначала включите «${BUNDLE_LABELS[parent]}» для этой роли.` },
        { status: 400 },
      );
    }
  } else {
    for (const child of childBundlesOf(bundle)) {
      if (bundlesBefore[child]) {
        return NextResponse.json(
          {
            error: `Сначала отключите «${BUNDLE_LABELS[child]}» для этой роли.`,
          },
          { status: 400 },
        );
      }
    }
  }

  const modulesToWrite = atomicModulesForBundleToggle(bundle);
  for (const module of modulesToWrite) {
    if (!ALL_APP_MODULES.includes(module)) continue;
    const def = defaultModuleAllowed(role, module);
    if (body.allowed === def) {
      await prisma.roleModuleAccess.deleteMany({
        where: { tenantId, role, module },
      });
    } else {
      await prisma.roleModuleAccess.upsert({
        where: {
          tenantId_role_module: { tenantId, role, module },
        },
        create: {
          tenantId,
          role,
          module,
          allowed: body.allowed,
        },
        update: { allowed: body.allowed },
      });
    }
  }

  const accAfter = await getEffectiveModuleAccess(tenantId, role, { db: prisma });
  return NextResponse.json({
    ok: true,
    effective: bundleAccessForResponse(accAfter),
  });
}
