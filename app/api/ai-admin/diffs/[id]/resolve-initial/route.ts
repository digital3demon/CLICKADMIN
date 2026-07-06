import { NextResponse } from "next/server";
import type { OrderEditInitial } from "@/components/orders/OrderEditForm";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { fetchOrderEditInitial } from "@/lib/order-edit-initial-fetcher";
import { getPrisma } from "@/lib/get-prisma";
import { loadKaitenIntegrationTenantState } from "@/lib/kaiten-integration/settings";

type LegacyPredictionJson = {
  patientName?: string | null;
  clinicId?: string | null;
  doctorId?: string | null;
  clinicHint?: string | null;
  doctorHint?: string | null;
  workDescription?: string | null;
  urgent?: boolean | null;
};

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function resolveClinicDoctorIds(
  tenantId: string,
  prediction: LegacyPredictionJson,
): Promise<{ clinicId: string | null; doctorId: string | null }> {
  if (prediction.clinicId || prediction.doctorId) {
    return {
      clinicId: prediction.clinicId ?? null,
      doctorId: prediction.doctorId ?? null,
    };
  }

  const clientsPrisma = await getClientsPrisma();
  let clinicId: string | null = null;
  let doctorId: string | null = null;

  if (prediction.clinicHint?.trim()) {
    const hint = normalize(prediction.clinicHint);
    const clinics = await clientsPrisma.clinic.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });
    const match = clinics.find((c) => normalize(c.name) === hint)
      ?? clinics.find((c) => normalize(c.name).includes(hint) || hint.includes(normalize(c.name)));
    clinicId = match?.id ?? null;
  }

  if (prediction.doctorHint?.trim()) {
    const hint = normalize(prediction.doctorHint);
    const doctors = await clientsPrisma.doctor.findMany({
      where: { tenantId },
      select: { id: true, fullName: true },
    });
    const match = doctors.find((d) => normalize(d.fullName) === hint)
      ?? doctors.find((d) => normalize(d.fullName).includes(hint) || hint.includes(normalize(d.fullName)));
    doctorId = match?.id ?? null;
  }

  return { clinicId, doctorId };
}

function buildAiOrderInitial(
  real: OrderEditInitial,
  prediction: LegacyPredictionJson,
  resolved: { clinicId: string | null; doctorId: string | null },
): OrderEditInitial {
  return {
    ...real,
    patientName: prediction.patientName ?? real.patientName,
    clientOrderText: prediction.workDescription ?? real.clientOrderText,
    isUrgent: prediction.urgent === true,
    clinicId: resolved.clinicId ?? real.clinicId,
    doctorId: resolved.doctorId ?? real.doctorId,
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await orderTenantIdForSession(s);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    if (s.role !== "OWNER" && s.actualRole !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: predictionId } = await ctx.params;
    const db = await getOrdersPrisma();

    const prediction = await db.aiOrderPrediction.findFirst({
      where: { id: predictionId, tenantId },
      select: {
        id: true,
        orderId: true,
        predictionJson: true,
        error: true,
      },
    });

    if (!prediction) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fetched = await fetchOrderEditInitial(tenantId, prediction.orderId, s);
    if (!fetched) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (fetched.archivedAt) {
      return NextResponse.json({ error: "Order archived" }, { status: 409 });
    }

    const predictionJson = (prediction.predictionJson ?? {}) as LegacyPredictionJson;
    const resolved = await resolveClinicDoctorIds(tenantId, predictionJson);
    const aiOrderInitial = buildAiOrderInitial(
      fetched.initial,
      predictionJson,
      resolved,
    );

    let kaitenIntegrationActive = true;
    try {
      const prisma = await getPrisma();
      const integration = await loadKaitenIntegrationTenantState(prisma, tenantId);
      kaitenIntegrationActive = integration.active;
    } catch {
      kaitenIntegrationActive = true;
    }

    return NextResponse.json({
      realOrderInitial: fetched.initial,
      aiOrderInitial,
      orderNumber: fetched.orderNumber,
      predictionError: prediction.error,
      kaitenIntegrationActive,
      kanbanCardUrl: fetched.kanbanAbs,
      demoKanbanCardTypes: fetched.demoKanbanCardTypes,
      isDemoMode: Boolean(s.demo),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
