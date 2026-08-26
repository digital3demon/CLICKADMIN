import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { CrmBackupClient } from "@/components/directory/CrmBackupClient";
import { CrmDumpClient } from "@/components/directory/CrmDumpClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function DirectoryCrmDumpPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/crm-dump");
  if (session.demo) redirect("/directory");
  const isOwner = (session.actualRole ?? session.role) === "OWNER";
  if (!isOwner) redirect("/directory");

  return (
    <ModuleFrame
      title="Бекап и восстановление CRM"
      description="Полный бекап для переезда на другой сервер: база, файлы и .env. Каждый день в 00:00 МСК архив перезаписывается. Срез за месяц — отдельно."
      descriptionClassName="max-w-3xl"
    >
      <div className="space-y-8">
        <CrmBackupClient />
        <CrmDumpClient />
      </div>
    </ModuleFrame>
  );
}
