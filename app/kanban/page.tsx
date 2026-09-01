import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { KanbanPageClient } from "@/components/kanban/KanbanPageClient";
import { getPrisma } from "@/lib/get-prisma";
import { loadKaitenIntegrationTenantState } from "@/lib/kaiten-integration/settings";

export const dynamic = "force-dynamic";

/**
 * Канбан-доска встроена в CRM (React + server client-state), без отдельного HTML.
 */
export default async function KanbanPage() {
  const session = await getSessionFromCookies();
  const isDemo = Boolean(session?.demo);
  let kaitenIntegrationActive = true;
  if (session && !isDemo) {
    try {
      const tenantId = await getTenantIdForSession(session);
      if (tenantId) {
        const prisma = await getPrisma();
        const integration = await loadKaitenIntegrationTenantState(
          prisma,
          tenantId,
        );
        kaitenIntegrationActive = integration.active;
      }
    } catch {
      kaitenIntegrationActive = true;
    }
  } else if (isDemo) {
    kaitenIntegrationActive = false;
  }
  return (
    <div className="kanban-root kanban-board-scale h-dvh min-h-0 w-full overflow-hidden">
      <KanbanPageClient
        isDemo={isDemo}
        kaitenIntegrationActive={kaitenIntegrationActive}
      />
    </div>
  );
}
