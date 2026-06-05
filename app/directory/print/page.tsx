import Link from "next/link";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { PrintTenantSettings } from "@/components/directory/PrintTenantSettings";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";

export const dynamic = "force-dynamic";

function canEditPrintSettings(role: UserRole | undefined): boolean {
  return (
    role === "OWNER" ||
    role === "SENIOR_ADMINISTRATOR" ||
    role === "ADMINISTRATOR"
  );
}

export default async function DirectoryPrintPage() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session) redirect("/login?next=/directory/print");
  if (access?.CONFIG_PRINT !== true) redirect("/directory");

  return (
    <ModuleFrame
      title="Печать"
      description="Шаблоны этикеток отгрузки: блоки, шрифты, пресеты для всей организации."
    >
      <PrintTenantSettings canEdit={canEditPrintSettings(session.role)} />
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
