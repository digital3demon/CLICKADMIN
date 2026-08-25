import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { sendOrderDocumentsMail } from "@/lib/order-document-mail";

export const dynamic = "force-dynamic";

function canUse(access: Record<string, boolean> | null | undefined): boolean {
  return access?.FINANCE_OFFICE === true || access?.ORDERS === true;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (!canUse(access)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const { id: orderId } = await params;
  const prisma = await getPrisma();
  const result = await sendOrderDocumentsMail({
    db: prisma,
    tenantId,
    orderId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, to: result.to });
}
