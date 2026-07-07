import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { runSelfCorrectionBatchInBackground } from "@/lib/llm/self-correction";

/** Догнать старые наряды, где предсказание ещё не сравнивали с эталоном админа. */
export async function POST(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await orderTenantIdForSession(s);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    if (s.role !== "OWNER" && s.actualRole !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getOrdersPrisma();

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { aiEnabled: true, aiApiKey: true },
    });

    if (!tenant?.aiEnabled || !tenant?.aiApiKey) {
      return NextResponse.json({ error: "AI is not configured or disabled" }, { status: 400 });
    }

    const predictions = await db.aiOrderPrediction.findMany({
      where: {
        tenantId,
        error: null,
        selfCorrectionAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true },
    });

    if (predictions.length === 0) {
      return NextResponse.json({ message: "No pending predictions", count: 0 });
    }

    runSelfCorrectionBatchInBackground(
      tenantId,
      predictions.map((p) => p.id),
    );

    return NextResponse.json({
      message: "Backlog self-correction started in background",
      count: predictions.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
