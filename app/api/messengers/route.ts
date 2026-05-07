import { DoctorMessengerItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { telegramSupergroupMessagePublicUrl } from "@/lib/telegram-supergroup-message-link";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const statusRaw = url.searchParams.get("status")?.trim().toLowerCase() ?? "open";
  const status =
    statusRaw === "archived"
      ? DoctorMessengerItemStatus.ARCHIVED
      : DoctorMessengerItemStatus.OPEN;
  const take = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("take") ?? "40") || 40),
  );

  const prisma = await getPrisma();
  const rows = await prisma.doctorMessengerItem.findMany({
    where: { tenantId, status },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      createdAt: true,
      telegramChatId: true,
      telegramMessageId: true,
      textFull: true,
      snippetBefore: true,
      snippetAfter: true,
      fromTgUsername: true,
      replyText: true,
      repliedAt: true,
      archivedAt: true,
      doctor: { select: { id: true, fullName: true } },
      replyAuthorUser: { select: { displayName: true } },
    },
  });

  const items = rows.map((r) => {
    const mid = Number(r.telegramMessageId);
    const tgUrl = telegramSupergroupMessagePublicUrl(r.telegramChatId, mid);
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      doctorId: r.doctor.id,
      doctorName: r.doctor.fullName,
      telegramChatId: r.telegramChatId,
      telegramMessageId: r.telegramMessageId,
      textFull: r.textFull,
      snippetBefore: r.snippetBefore,
      snippetAfter: r.snippetAfter,
      fromTgUsername: r.fromTgUsername,
      replyText: r.replyText,
      repliedAt: r.repliedAt?.toISOString() ?? null,
      archivedAt: r.archivedAt?.toISOString() ?? null,
      replyAuthorName: r.replyAuthorUser?.displayName ?? null,
      telegramMessageUrl: tgUrl,
    };
  });

  return NextResponse.json({ items });
}
