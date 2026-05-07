import { NextResponse } from "next/server";
import {
  createDoctorTelegramGroupBindToken,
} from "@/lib/doctor-telegram-group-bind";
import { jsonResponseIfAuthSecretMissing } from "@/lib/auth/require-auth-secret";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { normalizeTelegramBotUsername } from "@/lib/telegram-bot-username";

export const dynamic = "force-dynamic";

/** Сгенерировать одноразовую команду для привязки группы Telegram к врачу. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const secretMissing = jsonResponseIfAuthSecretMissing();
  if (secretMissing) return secretMissing;

  const session = await getSessionFromCookies();
  if (!session?.sub || session.demo) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(session);
  } catch {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 400 });
  }

  const { id: doctorId } = await ctx.params;
  const did = doctorId?.trim() ?? "";
  if (!did) {
    return NextResponse.json({ error: "Некорректный id врача" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const doctor = await prisma.doctor.findFirst({
    where: { id: did, tenantId, deletedAt: null },
    select: { id: true, fullName: true },
  });
  if (!doctor) {
    return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
  }

  const token = createDoctorTelegramGroupBindToken(tenantId, doctor.id);
  if (!token) {
    return NextResponse.json(
      { error: "Не задан AUTH_SECRET — нельзя сгенерировать привязку" },
      { status: 503 },
    );
  }

  const bindCommand = `/start ${token}`;
  const botName = normalizeTelegramBotUsername(
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME,
  );
  const deepLink = botName
    ? `https://t.me/${encodeURIComponent(botName)}?start=${encodeURIComponent(token)}`
    : null;

  return NextResponse.json({
    doctorName: doctor.fullName,
    token,
    bindCommand,
    deepLink,
    expiresInSec: 15 * 60,
    instruction:
      "Добавьте бота в группу, затем отправьте в группе команду целиком (скопируйте из поля bindCommand).",
  });
}
