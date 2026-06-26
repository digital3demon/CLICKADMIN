import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { PrintTenantSettings } from "@/components/directory/PrintTenantSettings";
import { canEditStickerPrintSettings } from "@/lib/auth/permissions";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";

export const dynamic = "force-dynamic";

export default async function DirectoryPrintPage() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session) redirect("/login?next=/directory/print");
  if (access?.CONFIG_PRINT !== true) redirect("/directory");

  const canEdit = canEditStickerPrintSettings(session.role, access);

  return (
    <ModuleFrame
      title="Печать"
      description="Шаблоны этикеток отгрузки и настройка публичной страницы по QR: блоки, шрифты, строки «Сроки»."
    >
      <PrintTenantSettings canEdit={canEdit} />
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
