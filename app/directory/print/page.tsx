import Link from "next/link";
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
  const { session } = await getSessionWithModuleAccess();
  return (
    <ModuleFrame
      title="Печать"
      description="Настройки печатных макетов: этикетки отгрузки, размеры под термопринтер и предпросмотр."
    >
      <PrintTenantSettings canEdit={canEditPrintSettings(session?.role)} />
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
