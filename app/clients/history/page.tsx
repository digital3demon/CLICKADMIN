import Link from "next/link";
import { ClientsHistoryClient } from "@/components/clients/ClientsHistoryClient";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";

export const dynamic = "force-dynamic";

export default async function ClientsHistoryPage() {
  const { session, access } = await getSessionWithModuleAccess();
  const canEditClients =
    session?.role === "OWNER" || access?.CLIENTS_EDIT === true;

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
      <ClientsHistoryClient canEditClients={canEditClients} />
    </ModuleFrame>
  );
}
