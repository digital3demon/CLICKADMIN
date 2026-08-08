import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { orderShipmentListStatusLabel } from "@/lib/order-shipment-list-status-label";
import { decodeOrderPublicRef, orderPathById } from "@/lib/order-public-ref";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { loadKanbanAppStateForTenant } from "@/lib/telegram-bot-kanban-stage-dline";
import {
  formatMoscowDate,
  formatMoscowDateTime,
} from "@/lib/moscow-datetime-format";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub || session.demo) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(session);
  } catch {
    return NextResponse.json({ error: "Нет организации" }, { status: 400 });
  }

  const url = new URL(req.url);
  const orderRef = url.searchParams.get("orderRef")?.trim() || "";
  const orderIdParam = url.searchParams.get("orderId")?.trim() || "";
  const cardId = url.searchParams.get("cardId")?.trim() || "";

  let orderId =
    orderIdParam ||
    (orderRef ? decodeOrderPublicRef(orderRef) : null) ||
    null;

  const base = crmPublicBaseUrl().replace(/\/+$/, "");

  if (!orderId && cardId) {
    const state = await loadKanbanAppStateForTenant(tenantId);
    let title = cardId;
    let statusLabel = "—";
    let linkedOrderId: string | null = null;

    if (state) {
      for (const board of state.boards ?? []) {
        for (const col of board.columns ?? []) {
          const colTitle = String(col.title ?? "").trim() || "—";
          for (const card of col.cards ?? []) {
            if (card.id !== cardId) continue;
            title = card.title.replace(/\n/g, " ").trim() || card.id;
            linkedOrderId = card.linkedOrderId?.trim() || null;
            statusLabel = card.blocked ? "Стоп" : colTitle;
          }
        }
        for (const ac of board.archivedCards ?? []) {
          if (ac?.card?.id === cardId) {
            title = ac.card.title.replace(/\n/g, " ").trim() || cardId;
            linkedOrderId = ac.card.linkedOrderId?.trim() || null;
            statusLabel = "Архив";
          }
        }
        for (const sc of board.stoppedCards ?? []) {
          if (sc?.card?.id === cardId) {
            title = sc.card.title.replace(/\n/g, " ").trim() || cardId;
            linkedOrderId = sc.card.linkedOrderId?.trim() || null;
            statusLabel = "Стоп";
          }
        }
      }
    }

    if (linkedOrderId) {
      orderId = linkedOrderId;
    } else {
      const kanbanRel = `/kanban?${new URLSearchParams({ card: cardId }).toString()}`;
      return NextResponse.json({
        kind: "card" as const,
        cardId,
        title,
        statusLabel,
        kanbanPath: `${base}${kanbanRel}`,
        kanbanRelPath: kanbanRel,
      });
    }
  }

  if (orderId) {
    const ordersDb = await resolveTenantPrismaClient(tenantId);
    const row = await ordersDb.order.findFirst({
      where: { id: orderId, tenantId, archivedAt: null },
      select: {
        id: true,
        orderNumber: true,
        patientName: true,
        doctorId: true,
        kaitenCardTitleLabel: true,
        dueDate: true,
        kaitenAdminDueHasTime: true,
        kaitenColumnTitle: true,
        demoKanbanColumn: true,
        labWorkStatus: true,
        kaitenBlocked: true,
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
    }

    const clientsPrisma = await getClientsPrisma();
    const doctor = await clientsPrisma.doctor.findFirst({
      where: { id: row.doctorId },
      select: { fullName: true },
    });

    const dueLabel = row.dueDate
      ? row.kaitenAdminDueHasTime === false
        ? formatMoscowDate(row.dueDate)
        : formatMoscowDateTime(row.dueDate)
      : null;

    return NextResponse.json({
      kind: "order" as const,
      orderId: row.id,
      orderNumber: row.orderNumber,
      patientName: row.patientName,
      doctorName: doctor?.fullName ?? "—",
      workLabel: row.kaitenCardTitleLabel?.trim() || null,
      statusLabel: orderShipmentListStatusLabel(row),
      dueLabel,
      orderPath: `${base}${orderPathById(row.id)}`,
      kanbanPath: `${base}${kanbanOrderDeepLinkPath(row.id)}`,
      kanbanRelPath: kanbanOrderDeepLinkPath(row.id),
    });
  }

  return NextResponse.json(
    { error: "Укажите orderRef, orderId или cardId" },
    { status: 400 },
  );
}
