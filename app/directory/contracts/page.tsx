import Link from "next/link";
import { ContractTemplateDirectoryClient } from "@/components/directory/ContractTemplateDirectoryClient";
import { ModuleFrame } from "@/components/layout/ModuleFrame";

export const dynamic = "force-dynamic";

export default function DirectoryContractsPage() {
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
