import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { TelegramDiagnosticClient } from "@/components/directory/TelegramDiagnosticClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function DirectoryTelegramPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/telegram");
  if (session.role !== "OWNER") redirect("/directory");

  return (
    <ModuleFrame
      title="Telegram"
      description="Диагностика бота CRM с сервера Timeweb: DNS и HTTPS до api.telegram.org, getMe, webhook. Без SSH — отчёт для поддержки и разбор «бот молчит»."
      descriptionClassName="max-w-3xl"
    >
      <TelegramDiagnosticClient />
      <p className="mt-8 text-sm">
        <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
          ← Конфигурация
        </Link>
      </p>
    </ModuleFrame>
  );
}
