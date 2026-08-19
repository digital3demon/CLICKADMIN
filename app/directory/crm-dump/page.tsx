import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { CrmDumpClient } from "@/components/directory/CrmDumpClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function DirectoryCrmDumpPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/crm-dump");
  const isOwner = (session.actualRole ?? session.role) === "OWNER";
  if (!isOwner) redirect("/directory");

  return (
    <ModuleFrame
      title="Дамп CRM"
      description={
        session.demo
          ? "Выгрузка среза демо-данных за месяц — сразу скачивание zip. В хранилище не пишется."
          : "Выгрузка среза данных за месяц — сразу скачивание zip. В хранилище не пишется; для демо-сайта обезличивается отдельно."
      }
      descriptionClassName="max-w-3xl"
    >
      <CrmDumpClient />
    </ModuleFrame>
  );
}
