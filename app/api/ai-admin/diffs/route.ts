import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { ensurePredictionEnriched, type AiPredictionJson } from "@/lib/ai-order-draft-from-prediction";

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
    const DEFAULT_PAGE_SIZE = 10;
    const MAX_PAGE_SIZE = 50;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    );
    const offset = (page - 1) * limit;

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
            workReceivedAt: true,
            dueDate: true,
            dueToAdminsAt: true,
            hasScans: true,
            legalEntity: true,
            payment: true,
            _count: { select: { constructions: true } },
          },
        },
        email: {
          select: {
            subject: true,
            textBody: true,
            preview: true,
          },
        },
      },
    });

    const items = await Promise.all(
      predictions.map(async (row) => {
        if (row.error) return row;
        try {
          const enriched = await ensurePredictionEnriched(db, tenantId, {
            predictionId: row.id,
            orderId: row.orderId,
            emailId: row.emailId,
            predictionJson: (row.predictionJson ?? {}) as AiPredictionJson,
            persist: true,
          });
          return {
            ...row,
            predictionJson: enriched as Prisma.JsonValue,
          };
        } catch {
          return row;
        }
      }),
    );

    const total = await db.aiOrderPrediction.count({ where: { tenantId } });
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize: limit,
      totalPages,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

