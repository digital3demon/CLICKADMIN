import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ClickMigConfigClient } from "@/components/clickmig/ClickMigConfigClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function DirectoryClickMigPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/clickmig");
  if (session.demo) redirect("/directory");

  return (
    <ModuleFrame
      title="Конфигурация КликМиг"
      description="Справочники, SMTP, API key, участники и таймеры"
    >
      <ClickMigConfigClient />
    </ModuleFrame>
  );
}
