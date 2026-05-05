import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { sanitizeMentionToken } from "@/lib/kanban-comment-mentions";
import { normalizeKanbanAdminMentionTag } from "@/lib/kanban-admin-mention";

export const dynamic = "force-dynamic";

function canEditTenantKanbanMentionTag(role: UserRole): boolean {
  return (
    role === "OWNER" ||
    role === "SENIOR_ADMINISTRATOR" ||
    role === "ADMINISTRATOR"
  );
}

/**
 * Сохраняет токен @упоминания «команда лаборатории» (ADMINISTRATOR + SENIOR_ADMINISTRATOR).
 * `null` или пустая строка — в БД null, в UI дефолт `clicklab`.
 */
export async function PATCH(req: Request) {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canEditTenantKanbanMentionTag(s.role as UserRole)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const raw = (body as { kanbanAdminMentionTag?: unknown }).kanbanAdminMentionTag;
  if (raw !== null && raw !== undefined && typeof raw !== "string") {
    return NextResponse.json({ error: "Ожидается строка или null" }, { status: 400 });
  }

  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed.length === 0) {
    const tenantId = await requireSessionTenantId(s);
    const prisma = await getPrisma();
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { kanbanAdminMentionTag: null },
    });
    return NextResponse.json({
      ok: true,
      kanbanAdminMentionTag: null,
    });
  }

  const sanitized = sanitizeMentionToken(trimmed);
  if (sanitized.length < 2 || sanitized.length > 32) {
    return NextResponse.json(
      { error: "Тег 2–32 символа: латиница, цифры, «_», «-», «.»" },
      { status: 400 },
    );
  }

  const tenantId = await requireSessionTenantId(s);
  const prisma = await getPrisma();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { kanbanAdminMentionTag: sanitized.toLowerCase() },
  });

  return NextResponse.json({
    ok: true,
    kanbanAdminMentionTag: normalizeKanbanAdminMentionTag(sanitized),
  });
}
