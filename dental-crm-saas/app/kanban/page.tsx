import { getSessionFromCookies } from "@/lib/auth/session-server";
import { KanbanApp } from "@/components/kanban/KanbanApp";

export const dynamic = "force-dynamic";

/**
 * Канбан-доска встроена в CRM (React + localStorage), без отдельного HTML.
 */
export default async function KanbanPage() {
  const session = await getSessionFromCookies();
  const isDemo = Boolean(session?.demo);
  return (
    <div className="kanban-root min-h-0 w-full overflow-hidden">
      <KanbanApp isDemo={isDemo} />
    </div>
  );
}
