import type { Prisma, PrismaClient, UserRole } from "@prisma/client";
import type { OrderChatToastRow } from "@/lib/order-chat-toasts.server";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";

const LAB_MENTION_ACK_ROLES: UserRole[] = [
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
];

function envFlagOn(name: string): boolean {
  const raw = String(process.env[name] ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function isOrderChatInboxDualReadEnabled(): boolean {
  return envFlagOn("ORDER_CHAT_INBOX_DUAL_READ");
}

/** По умолчанию false: иначе при неполном inbox пилюля упоминаний пропадает. */
export function isOrderChatInboxReadNewEnabled(): boolean {
  return envFlagOn("ORDER_CHAT_INBOX_READ_NEW");
}

/** Canary: глобальный READ_NEW или tenant в ORDER_CHAT_INBOX_READ_NEW_TENANTS. */
export function isOrderChatInboxReadNewEnabledForTenant(
  tenantId: string | null | undefined,
): boolean {
  if (isOrderChatInboxReadNewEnabled()) return true;
  const tid = String(tenantId ?? "").trim();
  if (!tid) return false;
  const raw = String(process.env.ORDER_CHAT_INBOX_READ_NEW_TENANTS ?? "").trim();
  if (!raw) return false;
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return set.has(tid);
}

type AckMap = Map<string, Date>;

async function fetchAckMap(
  db: PrismaClient,
  orderIds: string[],
  userId: string | null | undefined,
): Promise<AckMap> {
  if (orderIds.length === 0) return new Map();
  const ackByOrder = new Map<string, Date>();
  const globalAcks = await db.orderKaitenLabMentionAck.findMany({
    where: {
      orderId: { in: orderIds },
      user: { role: { in: LAB_MENTION_ACK_ROLES } },
    },
    select: { orderId: true, ackAt: true },
  });
  for (const a of globalAcks) {
    const prev = ackByOrder.get(a.orderId);
    if (!prev || a.ackAt.getTime() > prev.getTime()) ackByOrder.set(a.orderId, a.ackAt);
  }
  const uid = String(userId || "").trim();
  if (uid) {
    const userRow = await db.user.findUnique({
      where: { id: uid },
      select: { role: true },
    });
    const canOwnAck =
      userRow?.role === "OWNER" ||
      userRow?.role === "ADMINISTRATOR" ||
      userRow?.role === "SENIOR_ADMINISTRATOR";
    if (canOwnAck) {
      const ownAcks = await db.orderKaitenLabMentionAck.findMany({
        where: { orderId: { in: orderIds }, userId: uid },
        select: { orderId: true, ackAt: true },
      });
      for (const a of ownAcks) {
        const prev = ackByOrder.get(a.orderId);
        if (!prev || a.ackAt.getTime() > prev.getTime()) {
          ackByOrder.set(a.orderId, a.ackAt);
        }
      }
    }
  }
  return ackByOrder;
}

function labMentionPendingByAck(createdAt: Date, ackAt: Date | null | undefined): boolean {
  if (!ackAt) return true;
  return ackAt.getTime() < createdAt.getTime();
}

export async function countOrdersWithPendingInboxLabMentionForUser(
  db: PrismaClient,
  baseWhere: Prisma.OrderWhereInput,
  userId?: string,
): Promise<number> {
  const orderRows = await db.order.findMany({
    where: baseWhere,
    select: { id: true },
  });
  const orderIds = orderRows.map((r) => r.id);
  if (orderIds.length === 0) return 0;
  const latestItems = await (db as any).orderChatInboxItem.findMany({
    where: {
      orderId: { in: orderIds },
      type: "LAB_MENTION",
    },
    orderBy: { createdAt: "desc" },
    select: { orderId: true, createdAt: true },
  });
  if (!latestItems.length) return 0;
  const latestByOrder = new Map<string, Date>();
  for (const row of latestItems as Array<{ orderId: string; createdAt: Date }>) {
    if (!latestByOrder.has(row.orderId)) latestByOrder.set(row.orderId, row.createdAt);
  }
  const ackMap = await fetchAckMap(db, [...latestByOrder.keys()], userId);
  let n = 0;
  for (const [orderId, createdAt] of latestByOrder.entries()) {
    if (labMentionPendingByAck(createdAt, ackMap.get(orderId))) n += 1;
  }
  return n;
}

export async function fetchInboxLabMentionToastRows(
  db: PrismaClient,
  userId: string | null | undefined,
  tenantId?: string | null,
): Promise<OrderChatToastRow[]> {
  const tid = String(tenantId ?? "").trim();
  const rows = await (db as any).orderChatInboxItem.findMany({
    where: {
      type: "LAB_MENTION",
      order: {
        archivedAt: null,
        ...(tid ? { tenantId: tid } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    take: 64,
    select: {
      orderId: true,
      text: true,
      authorLabel: true,
      createdAt: true,
      order: {
        select: {
          orderNumber: true,
          patientName: true,
          doctor: { select: { fullName: true } },
        },
      },
    },
  });
  if (!rows.length) return [];
  const latestByOrder = new Map<
    string,
    {
      createdAt: Date;
      text: string;
      authorLabel: string | null;
      orderNumber: string;
      patientName: string | null;
      doctorName: string | null;
    }
  >();
  for (const row of rows as Array<{
    orderId: string;
    text: string;
    authorLabel: string | null;
    createdAt: Date;
    order: {
      orderNumber: string;
      patientName: string | null;
      doctor: { fullName: string };
    };
  }>) {
    if (!latestByOrder.has(row.orderId)) {
      latestByOrder.set(row.orderId, {
        createdAt: row.createdAt,
        text: row.text,
        authorLabel: row.authorLabel ?? null,
        orderNumber: row.order.orderNumber,
        patientName: row.order.patientName
          ? personNameSurnameInitials(row.order.patientName)
          : null,
        doctorName: personNameSurnameInitials(row.order.doctor.fullName) || null,
      });
    }
  }
  const ackMap = await fetchAckMap(db, [...latestByOrder.keys()], userId);
  const out: OrderChatToastRow[] = [];
  for (const [orderId, row] of latestByOrder.entries()) {
    if (!labMentionPendingByAck(row.createdAt, ackMap.get(orderId))) continue;
    out.push({
      id: `${orderId}:${row.createdAt.getTime()}`,
      text: row.text.trim() || "Упоминание в чате",
      authorLabel: row.authorLabel,
      orderId,
      orderNumber: row.orderNumber,
      patientName: row.patientName,
      doctorName: row.doctorName,
      createdAt: row.createdAt.toISOString(),
    });
  }
  return out.slice(0, 8);
}

export async function hydrateOrderInboxLabMentionHighlightMap(
  db: PrismaClient,
  userId: string | null | undefined,
  orderIds: string[],
): Promise<Map<string, boolean>> {
  if (orderIds.length === 0) return new Map();
  const rows = await (db as any).orderChatInboxItem.findMany({
    where: {
      orderId: { in: orderIds },
      type: "LAB_MENTION",
    },
    orderBy: { createdAt: "desc" },
    select: { orderId: true, createdAt: true },
  });
  const latestByOrder = new Map<string, Date>();
  for (const row of rows as Array<{ orderId: string; createdAt: Date }>) {
    if (!latestByOrder.has(row.orderId)) latestByOrder.set(row.orderId, row.createdAt);
  }
  const ackMap = await fetchAckMap(db, [...latestByOrder.keys()], userId);
  const out = new Map<string, boolean>();
  for (const orderId of orderIds) out.set(orderId, false);
  for (const [orderId, createdAt] of latestByOrder.entries()) {
    out.set(orderId, labMentionPendingByAck(createdAt, ackMap.get(orderId)));
  }
  return out;
}

