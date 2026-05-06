import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { DirectoryKanbanBoardsClient } from "@/components/directory/DirectoryKanbanBoardsClient";
import { normalizeTelegramBotUsername } from "@/lib/telegram-bot-username";

export const dynamic = "force-dynamic";

export default async function DirectoryKanbanBoardsPage() {
  const session = await getSessionFromCookies();
  const isDemo = Boolean(session?.demo);
  const role: UserRole = session?.role ?? "USER";
  const telegramBotUsername = normalizeTelegramBotUsername(
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME,
  );
  return (
    <ModuleFrame
      title="Канбан и ERP"
      description="Доски встроенного канбана (страница «Канбан» в меню), слоты времени для поля «Срок лабораторный» в нарядах. Интеграция Kaiten API — в разделе «Кайтен»."
    >
      <DirectoryKanbanBoardsClient
        isDemo={isDemo}
        sessionRole={role}
        telegramBotUsername={telegramBotUsername}
      />
      <p className="mt-8 text-sm">
        <Link
          href="/directory"
          className="text-[var(--sidebar-blue)] hover:underline"
        >
          ← Конфигурация
        </Link>
      </p>
    </ModuleFrame>
  );
}
