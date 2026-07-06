import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export async function POST(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const tenantId = await orderTenantIdForSession(s);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });
    
    if (s.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const db = await getOrdersPrisma();
    
    const updateData: any = {
      aiEnabled: Boolean(body.aiEnabled),
    };
    
    if (typeof body.apiKey === "string" && body.apiKey.trim().length > 0) {
      updateData.openRouterApiKey = body.apiKey.trim();
    }

    await db.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
