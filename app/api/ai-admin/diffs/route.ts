import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export async function GET(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const tenantId = await orderTenantIdForSession(s);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });
    
    if (s.role !== "OWNER" && s.actualRole !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const db = await getOrdersPrisma();
    
    const predictions = await db.aiOrderPrediction.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            patientName: true,
            clinic: { select: { name: true } },
            doctor: { select: { fullName: true } },
            clientOrderText: true,
            isUrgent: true,
          }
        },
        email: {
          select: {
            subject: true,
            textBody: true,
            preview: true,
          }
        }
      }
    });

    const total = await db.aiOrderPrediction.count({ where: { tenantId } });

    return NextResponse.json({ items: predictions, total });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
