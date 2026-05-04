import Link from "next/link";
import { redirect } from "next/navigation";
import { ContractTemplateDirectoryClient } from "@/components/directory/ContractTemplateDirectoryClient";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";

export const dynamic = "force-dynamic";

export default async function DirectoryContractsPage() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session) {
    redirect("/login?next=/directory/contracts");
  }
  if (access?.CONFIG_CONTRACT_TEMPLATE !== true && session.role !== "OWNER") {
    redirect("/directory");
  }

  return (
    <ModuleFrame
      title="Шаблон договора"
      description="Загрузка типового .docx шаблона договора и автоматическое распознавание полей замены по красному тексту в кавычках."
    >
      <ContractTemplateDirectoryClient />
      <p className="mt-8 text-sm">
        <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
          ← Конфигурация
        </Link>
      </p>
    </ModuleFrame>
  );
}
