import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { telegramSendMessage } from "@/lib/telegram-send-message";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

function redirect(pathWithQuery: string): NextResponse {
  return NextResponse.redirect(new URL(pathWithQuery, crmPublicBaseUrl()));
}

export async function GET(req: Request) {
  if (isSingleUserPortable()) {
    return redirect("/directory/profile?tg=denied");
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return redirect("/directory/profile?tg=bad");
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    return redirect("/directory/profile?tg=config");
  }

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.telegramLinkToken.findUnique({
        where: { token },
      });
      if (!row || row.consumedAt) {
        return { kind: "bad" as const };
      }
      if (row.expiresAt < now) {
        return { kind: "expired" as const };
      }

      const taken = await tx.user.findFirst({
        where: {
          telegramId: row.telegramUserId,
          NOT: { id: row.userId },
        },
        select: { id: true },
      });
      if (taken) {
        return { kind: "taken" as const };
      }

      await tx.telegramLinkToken.update({
        where: { id: row.id },
        data: { consumedAt: now },
      });

      const cur = await tx.user.findUnique({
        where: { id: row.userId },
        select: { telegramId: true },
      });
      if (cur?.telegramId?.trim() !== row.telegramUserId) {
        await tx.user.update({
          where: { id: row.userId },
          data: {
            telegramId: row.telegramUserId,
            telegramUsername: row.telegramUsername?.trim() || null,
          },
        });
      }

      await tx.telegramBotLinkPending.deleteMany({
        where: { telegramUserId: row.telegramUserId },
      });

      return {
        kind: "ok" as const,
        chatId: row.telegramUserId,
      };
    });

    if (result.kind === "ok" && result.chatId) {
      const m = await telegramSendMessage(
        botToken,
        result.chatId,
        "Готово: этот Telegram привязан к вашему профилю в CRM. Уведомления можно включить в разделе «Настройка профиля».",
      );
      if (!m.ok) {
        console.warn("[telegram-link confirm] post-bind message:", m.error);
      }
      return redirect("/directory/profile?tg=linked");
    }
    if (result.kind === "expired") {
      return redirect("/directory/profile?tg=expired");
    }
    if (result.kind === "taken") {
      return redirect("/directory/profile?tg=taken");
    }
    return redirect("/directory/profile?tg=bad");
  } catch (e) {
    console.error("[telegram-link confirm]", e);
    return redirect("/directory/profile?tg=err");
  }
}
