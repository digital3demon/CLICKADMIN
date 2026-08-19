import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { DemoAccessCodesClient } from "@/components/directory/DemoAccessCodesClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isCrmStandaloneDemo } from "@/lib/crm-standalone-demo";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DirectoryDemoAccessPage() {
  if (isCrmStandaloneDemo()) {
    redirect("/directory");
  }
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "OWNER" || session.demo) {
    return (
      <ModuleFrame
        title="Доступ к демо"
        description="Одноразовые коды входа в общее демо."
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Генерация кодов доступна только владельцу рабочей CRM.
        </p>
      </ModuleFrame>
    );
  }

  return (
    <ModuleFrame
      title="Доступ к демо"
      description="Общее демо без организаций: один код — один вход на одну машину."
    >
      <DemoAccessCodesClient />
    </ModuleFrame>
  );
}
