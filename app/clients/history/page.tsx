import Link from "next/link";
import { ClientsHistoryClient } from "@/components/clients/ClientsHistoryClient";
import { ModuleFrame } from "@/components/layout/ModuleFrame";

export const dynamic = "force-dynamic";

export default function ClientsHistoryPage() {
  return (
    <ModuleFrame
      title="История и удалённые"
      description="Журнал изменений клиник и врачей, восстановление мягко удалённых записей."
    >
      <div className="mb-4">
        <Link
          href="/clients"
          className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          ← Клиенты
        </Link>
      </div>
      <ClientsHistoryClient />
    </ModuleFrame>
  );
}
