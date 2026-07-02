import { NextResponse } from "next/server";
import { canAccessOrderChat, isKanbanOnlyUser } from "@/lib/auth/permissions";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { fetchOrderChatToastRows } from "@/lib/order-chat-toasts.server";

export const dynamic = "force-dynamic";

/** Непрочитанные сообщения чата (@лаборатория) для глобальных уведомлений. */
export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (
    !session ||
    isKanbanOnlyUser(session.role, access ?? undefined) ||
    !canAccessOrderChat(session.role, access ?? undefined)
  ) {
    return NextResponse.json(
      { messages: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const prisma = await getOrdersPrisma();
  const messages = await fetchOrderChatToastRows(prisma, session.sub);

  return NextResponse.json(
    { messages },
    { headers: { "Cache-Control": "no-store" } },
  );
}
