import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import {
  buildKanbanColumnCatalog,
  KANBAN_STATE_KEY,
} from "@/lib/kanban-column-catalog";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (access?.CONFIG_PRINT !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const row = await (await getPrisma()).tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true },
  });
  const columns = buildKanbanColumnCatalog(row?.value ?? null);
  return NextResponse.json({ columns });
}
