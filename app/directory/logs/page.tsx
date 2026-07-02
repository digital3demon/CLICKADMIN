import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { LogsExportClient } from "@/components/directory/LogsExportClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function DirectoryLogsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/logs");
  if (session.role !== "OWNER") redirect("/directory");

  return (
    <ModuleFrame
      title="Логи"
      description="Выгрузка серверных логов CRM за выбранный период в текстовый файл. Удобно для периодической проверки синхронизации Kaiten, cron и почты."
      descriptionClassName="max-w-3xl"
    >
      <LogsExportClient />
      <p className="mt-8 text-sm">
        <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
          ← Конфигурация
        </Link>
      </p>
    </ModuleFrame>
  );
}
