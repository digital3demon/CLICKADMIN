import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { TenantApiKeysClient } from "@/components/directory/TenantApiKeysClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DirectoryApiKeysPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "OWNER") {
    return (
      <ModuleFrame title="API" description="Ключи доступа для внешних программ.">
        <p className="text-sm text-[var(--text-secondary)]">
          Управление API-ключами доступно только владельцу организации.
        </p>
      </ModuleFrame>
    );
  }

  return (
    <ModuleFrame
      title="API"
      description="Именные ключи (как у OpenRouter): генерируются один раз, для сканера книг и будущих интеграций."
    >
      <TenantApiKeysClient />
    </ModuleFrame>
  );
}
