import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { FinanceOfficeTenantSettings } from "@/components/directory/FinanceOfficeTenantSettings";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";

export const dynamic = "force-dynamic";

export default async function DirectoryFinanceOfficePage() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session) redirect("/login?next=/directory/finance-office");
  if (access?.FINANCE_OFFICE !== true) redirect("/directory");

  return (
    <ModuleFrame
      title="ФинОтдел"
      description="Тема и текст письма о долге, срок в рабочих днях МСК и ящик для рассылки."
    >
      <FinanceOfficeTenantSettings />
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
