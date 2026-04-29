import { NextResponse } from "next/server";
import type { AppModule, UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getPrisma } from "@/lib/get-prisma";
import {
  ALL_APP_MODULES,
  APP_MODULE_LABELS,
  defaultModuleAllowed,
  ROLES_IN_ACCESS_MATRIX,
} from "@/lib/role-module-defaults";
import {
  getEffectiveModuleAccess,
  moduleAccessForResponse,
} from "@/lib/role-module-resolver";

export const dynamic = "force-dynamic";

/**
 * Матрица «роль × модуль» (только владелец).
 * effective — итог с учётом БД; для OWNER не возвращаем (всегда полный доступ).
 */
export async function GET() {
  const s = await getSessionFromCookies();
  if (!s || s.role !== "OWNER") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = s.tid;
  if (!tenantId) {
    return NextResponse.json({ error: "Нет организации" }, { status: 400 });
  }

  const effective: Record<string, Record<string, boolean>> = {};
  for (const role of ROLES_IN_ACCESS_MATRIX) {
    const acc = await getEffectiveModuleAccess(tenantId, role);
    effective[role] = moduleAccessForResponse(acc);
  }

  return NextResponse.json({
    modules: ALL_APP_MODULES.map((m) => ({ id: m, label: APP_MODULE_LABELS[m] })),
    roles: ROLES_IN_ACCESS_MATRIX,
    effective,
  });
}

type PutBody = {
  role?: UserRole;
  module?: AppModule;
  allowed?: boolean;
};

export async function PUT(req: Request) {
  const s = await getSessionFromCookies();
  if (!s || s.role !== "OWNER") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = s.tid;
  if (!tenantId) {
    return NextResponse.json({ error: "Нет организации" }, { status: 400 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const role = body.role;
  const module = body.module;
  if (
    role == null ||
    module == null ||
    typeof body.allowed !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Ожидается role, module, allowed" },
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
  if (!ALL_APP_MODULES.includes(module)) {
    return NextResponse.json({ error: "Некорректный модуль" }, { status: 400 });
  }

  const def = defaultModuleAllowed(role, module);
  const prisma = await getPrisma();
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

  return NextResponse.json({ ok: true });
}
