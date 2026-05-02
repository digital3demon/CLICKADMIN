import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { canManageUsers } from "@/lib/auth/permissions";
import { hashSecret } from "@/lib/auth/password";
import { generateInviteCodePlain } from "@/lib/auth/invite-code";
import { INVITABLE_ROLES } from "@/lib/user-role-labels";
import {
  normalizeRuPhoneDigits,
  placeholderEmailFromNormalizedPhone,
} from "@/lib/phone-normalize";
import { sendInviteActivationEmail } from "@/lib/email/send-invite-email";

type Body = {
  email?: string;
  phone?: string;
  displayName?: string;
  role?: string;
};

function normEmail(v: string): string {
  return v.trim().toLowerCase();
}

function isInvitableRole(r: string): r is UserRole {
  return (INVITABLE_ROLES as readonly string[]).includes(r);
}

export async function POST(req: Request) {
  const { session: s, access } = await getSessionWithModuleAccess();
  if (!s || !canManageUsers(s.role, access ?? undefined)) {
    return NextResponse.json(
      { error: "Нет права на приглашение пользователей" },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const displayName = (body.displayName ?? "").trim();
  const roleRaw = String(body.role ?? "").trim();
  const phoneRaw = String(body.phone ?? "").trim();
  const email = normEmail(body.email ?? "");

  if (!displayName) {
    return NextResponse.json({ error: "Укажите ФИО" }, { status: 400 });
  }
  if (!isInvitableRole(roleRaw)) {
    return NextResponse.json({ error: "Выберите роль из списка" }, { status: 400 });
  }

  /** Приглашение по телефону — вход только через Telegram с этим номером. */
  if (phoneRaw) {
    const norm = normalizeRuPhoneDigits(phoneRaw);
    if (!norm) {
      return NextResponse.json(
        { error: "Укажите корректный российский номер телефона" },
        { status: 400 },
      );
    }

    const db0 = await getPrisma();
    const inviter0 = await db0.user.findUniqueOrThrow({
      where: { id: s.sub },
      select: { tenantId: true },
    });
    const existingPhone = await db0.user.findFirst({
      where: { phone: norm, tenantId: inviter0.tenantId },
      select: { id: true, email: true, role: true, passwordHash: true },
    });
    if (existingPhone?.role === "OWNER") {
      return NextResponse.json(
        { error: "Этот номер уже связан с владельцем" },
        { status: 400 },
      );
    }
    if (existingPhone?.passwordHash) {
      return NextResponse.json(
        {
          error:
            "У пользователя с этим номером уже задан пароль. Отключите доступ или смените номер.",
        },
        { status: 400 },
      );
    }

    const emailForRow =
      existingPhone?.email ?? placeholderEmailFromNormalizedPhone(norm);

    const db1 = await getPrisma();
    const inviter1 = await db1.user.findUniqueOrThrow({
      where: { id: s.sub },
      select: { tenantId: true },
    });
    await db1.user.upsert({
      where: {
        tenantId_email: { tenantId: inviter1.tenantId, email: emailForRow },
      },
      create: {
        tenantId: inviter1.tenantId,
        email: emailForRow,
        phone: norm,
        displayName,
        role: roleRaw,
        inviteCodeHash: null,
        passwordHash: null,
        isActive: true,
      },
      update: {
        phone: norm,
        displayName,
        role: roleRaw,
        inviteCodeHash: null,
        passwordHash: null,
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      hint: "Передайте сотруднику номер и роль. Вход: страница /login — поле «Телефон» и кнопка Telegram.",
    });
  }

  /** Классическое приглашение: почта + код активации. */
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Укажите корректную почту или номер телефона" },
      { status: 400 },
    );
  }

  const db2 = await getPrisma();
  const inviter2 = await db2.user.findUniqueOrThrow({
    where: { id: s.sub },
    select: { tenantId: true },
  });
  const existing = await db2.user.findFirst({
    where: { email, tenantId: inviter2.tenantId },
    select: { id: true, role: true, passwordHash: true },
  });
  if (existing?.role === "OWNER") {
    return NextResponse.json(
      { error: "Эта почта уже занята владельцем" },
      { status: 400 },
    );
  }
  if (existing?.passwordHash) {
    return NextResponse.json(
      {
        error:
          "У пользователя уже задан пароль. Отключите доступ или используйте другую почту.",
      },
      { status: 400 },
    );
  }

  const invitePlain = generateInviteCodePlain();
  const inviteCodeHash = await hashSecret(invitePlain);

  await db2.user.upsert({
    where: { tenantId_email: { tenantId: inviter2.tenantId, email } },
    create: {
      tenantId: inviter2.tenantId,
      email,
      displayName,
      role: roleRaw,
      inviteCodeHash,
      passwordHash: null,
      isActive: true,
    },
    update: {
      displayName,
      role: roleRaw,
      inviteCodeHash,
      passwordHash: null,
      isActive: true,
    },
  });

  const mail = await sendInviteActivationEmail({
    to: email,
    displayName,
    inviteCode: invitePlain,
  });

  if (mail.sent) {
    return NextResponse.json({
      ok: true,
      emailSent: true,
      hint: `На ${email} отправлено письмо с кодом и ссылкой на страницу активации.`,
    });
  }

  if (mail.reason === "not_configured") {
    return NextResponse.json({
      ok: true,
      emailSent: false,
      inviteCode: invitePlain,
      hint:
        "Почта не настроена: задайте EMAIL_FROM и один из вариантов — SMTP (SMTP_URL или SMTP_HOST+SMTP_USER+SMTP_PASS), или Unisender Go (UNISENDER_GO_API_KEY из кабинета), или RESEND_API_KEY. Пока передайте код вручную. Первый вход: /login/activate",
    });
  }

  console.error("[users/invite] email", mail.error);
  return NextResponse.json({
    ok: true,
    emailSent: false,
    inviteCode: invitePlain,
    hint: `Письмо не доставлено (${mail.error}). Передайте код вручную. Первый вход: /login/activate`,
  });
}
