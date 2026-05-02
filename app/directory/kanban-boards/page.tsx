import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { DirectoryKanbanBoardsClient } from "@/components/directory/DirectoryKanbanBoardsClient";

export const dynamic = "force-dynamic";

export default async function DirectoryKanbanBoardsPage() {
  const session = await getSessionFromCookies();
  const isDemo = Boolean(session?.demo);
  const role: UserRole = session?.role ?? "USER";
  return (
    <ModuleFrame
      title="Канбан: доски"
      description="Создание досок, переименование, типы карточек и участники для встроенного канбана (страница «Канбан» в меню). Отдельно от интеграции Kaiten API — см. раздел «Кайтен»."
    >
      <DirectoryKanbanBoardsClient isDemo={isDemo} sessionRole={role} />
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
