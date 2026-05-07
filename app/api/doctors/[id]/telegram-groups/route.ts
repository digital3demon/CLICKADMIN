import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Ручное добавление группы по chat id (как прислал бот после добавления в группу). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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

  let body: { telegramChatId?: unknown; label?: unknown };
  try {
    body = (await req.json()) as { telegramChatId?: unknown; label?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const rawChatId = String(body.telegramChatId ?? "").trim().replace(/\s+/g, "");
  if (!/^-?\d+$/.test(rawChatId)) {
    return NextResponse.json(
      {
        error:
          "Укажите числовой chat id группы (из сообщения бота или свойства чата).",
      },
      { status: 400 },
    );
  }

  const label = trimOrNull(body.label);

  const prisma = await getPrisma();
  const doctor = await prisma.doctor.findFirst({
    where: { id: did, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!doctor) {
    return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
  }

  const taken = await prisma.doctorTelegramGroup.findUnique({
    where: {
      tenantId_telegramChatId: {
        tenantId,
        telegramChatId: rawChatId,
      },
    },
    select: { id: true, doctorId: true },
  });
  if (taken && taken.doctorId !== doctor.id) {
    return NextResponse.json(
      { error: "Этот chat id уже привязан к другому врачу" },
      { status: 409 },
    );
  }

  await prisma.doctorTelegramGroup.upsert({
    where: {
      tenantId_telegramChatId: {
        tenantId,
        telegramChatId: rawChatId,
      },
    },
    create: {
      tenantId,
      doctorId: doctor.id,
      telegramChatId: rawChatId,
      label,
    },
    update: {
      doctorId: doctor.id,
      label,
    },
  });

  return NextResponse.json({ ok: true });
}
