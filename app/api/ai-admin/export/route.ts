import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { loadClinicDoctorCatalogText } from "@/lib/llm/order-email-extract";
import { buildDatasetJsonlLine } from "@/lib/llm/dataset-export";

export async function GET(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await orderTenantIdForSession(s);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    if (s.role !== "OWNER" && s.actualRole !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getOrdersPrisma();
    const catalogText = await loadClinicDoctorCatalogText(tenantId);

    const links = await db.emailSourceOrder.findMany({
      where: { tenantId },
      include: {
        order: {
        select: {
          id: true,
          createdAt: true,
          patientName: true,
          clinicId: true,
          doctorId: true,
            clientOrderText: true,
            isUrgent: true,
            workReceivedAt: true,
            dueDate: true,
            dueToAdminsAt: true,
            hasScans: true,
            hasCt: true,
            hasMri: true,
            hasPhoto: true,
            legalEntity: true,
            payment: true,
            attachments: {
              select: { fileName: true, mimeType: true },
              where: { scope: "GENERAL" },
            },
            constructions: {
              select: {
                quantity: true,
                teethFdi: true,
                priceListItem: { select: { code: true, name: true } },
              },
            },
          },
        },
        email: {
          select: {
            id: true,
            subject: true,
            textBody: true,
            preview: true,
            fromAddress: true,
            receivedAt: true,
            attachments: {
              select: { id: true, fileName: true, mimeType: true, size: true },
            },
          },
        },
      },
      orderBy: [{ orderId: "asc" }, { createdAt: "asc" }],
    });

    const byOrderId = new Map<string, typeof links>();
    for (const link of links) {
      const list = byOrderId.get(link.orderId) ?? [];
      list.push(link);
      byOrderId.set(link.orderId, list);
    }

    let jsonl = "";
    for (const [, orderLinks] of byOrderId) {
      const order = orderLinks[0]?.order;
      if (!order) continue;

      const emails = orderLinks.map((link) => link.email);
      const line = await buildDatasetJsonlLine(db, tenantId, order, emails, catalogText);
      if (line) {
        jsonl += line + "\n";
      }
    }

    return new NextResponse(jsonl, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": 'attachment; filename="ai-dataset.jsonl"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
