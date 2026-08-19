import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { canChangeUserRoles } from "@/lib/auth/permissions";
import { hashSecret } from "@/lib/auth/password";
import {
  generatePasswordResetCodePlain,
  passwordResetExpiresAt as computePasswordResetExpiresAt,
} from "@/lib/auth/password-reset";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/users/:id/reset-code
 * Владелец выдаёт одноразовый код сброса. Пароль в БД не меняется, пока сотрудник
 * не подтвердит код на /login/forgot.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const { session: s } = await getSessionWithModuleAccess();
  if (!s || !canChangeUserRoles(s.role)) {
    return NextResponse.json(
      { error: "Код сброса пароля выдаёт только владелец" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const inviter = await prisma.user.findUnique({
    where: { id: s.sub },
    select: { tenantId: true },
  });
  if (!inviter?.tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  const target = await prisma.user.findFirst({
    where: { id: id.trim(), tenantId: inviter.tenantId },
    select: {
      id: true,
      displayName: true,
      email: true,
      isActive: true,
      passwordHash: true,
    },
  });
  if (!target) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  if (!target.isActive) {
    return NextResponse.json(
      { error: "Сначала включите доступ пользователю" },
      { status: 400 },
    );
  }
  if (!target.passwordHash) {
    return NextResponse.json(
      {
        error:
          "Пароль ещё не задан. Сотрудник входит по коду приглашения: /login/activate",
      },
      { status: 400 },
    );
  }

  const code = generatePasswordResetCodePlain();
  const passwordResetCodeHash = await hashSecret(code);
  const expiresAt = computePasswordResetExpiresAt();

  await prisma.user.update({
    where: { id: target.id },
    data: { passwordResetCodeHash, passwordResetExpiresAt: expiresAt },
  });

  return NextResponse.json({
    ok: true,
    resetCode: code,
    expiresAt: expiresAt.toISOString(),
    hint: `Передайте код ${target.displayName}. Сотрудник: вход → «Забыл пароль». Код действует 24 часа.`,
  });
}
