import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import { buildKaitenCardDescription } from "@/lib/kaiten-order-sync";
import {
  activeContinuationChildrenWhere,
  mapContinuationChildrenRefs,
} from "@/lib/order-continuation-display";
import { getKaitenRestAuth, kaitenPatchCard } from "@/lib/kaiten-rest";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";

type HeadSelect = {
  kaitenCardId: number | null;
  doctorId: string;
  kaitenCardTypeId: string | null;
  orderNumber: string;
  patientName: string | null;
  dueDate: Date | null;
  kaitenAdminDueHasTime: boolean | null;
  kaitenCardTitleLabel: string | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  clientOrderText: string | null;
  notes: string | null;
  continuesFromOrder: {
    orderNumber: string;
    kaitenCardId: number | null;
  } | null;
  continuationOrders: {
    id: string;
    orderNumber: string;
    kaitenCardId: number | null;
  }[];
};

async function loadOrderForKaitenHead(
  orderId: string,
): Promise<HeadSelect | null> {
  const prisma = await getOrdersPrisma();
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      kaitenCardId: true,
      doctorId: true,
      kaitenCardTypeId: true,
      orderNumber: true,
      patientName: true,
      dueDate: true,
      kaitenAdminDueHasTime: true,
      kaitenCardTitleLabel: true,
      isUrgent: true,
      urgentCoefficient: true,
      clientOrderText: true,
      notes: true,
      continuesFromOrder: {
        select: {
          orderNumber: true,
          kaitenCardId: true,
        },
      },
      continuationOrders: {
        where: activeContinuationChildrenWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          kaitenCardId: true,
        },
      },
    },
  });
}

async function computeKaitenHeadForOrder(orderId: string): Promise<{
  kaitenCardId: number | null;
  title: string;
  description: string;
  descriptionMirror: string | null;
  asap: boolean;
} | null> {
  const order = await loadOrderForKaitenHead(orderId);
  if (!order) return null;
  const clientsPrisma = await getClientsPrisma();
  const [doctor, kaitenCardType] = await Promise.all([
    clientsPrisma.doctor.findUnique({
      where: { id: order.doctorId },
      select: { fullName: true },
    }),
    order.kaitenCardTypeId
      ? clientsPrisma.kaitenCardType.findUnique({
          where: { id: order.kaitenCardTypeId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const description = buildKaitenCardDescription(
    order.clientOrderText,
    order.notes,
    order.continuesFromOrder
      ? {
          orderNumber: order.continuesFromOrder.orderNumber,
          kaitenCardId: order.continuesFromOrder.kaitenCardId,
        }
      : null,
    mapContinuationChildrenRefs(order.continuationOrders),
  );
  const descriptionMirror = description.trim() ? description : null;

  const title = buildKaitenCardTitle({
    orderNumber: order.orderNumber,
    patientName: order.patientName,
    doctor: { fullName: doctor?.fullName ?? "—" },
    dueDate: order.dueDate,
    kaitenLabDueHasTime: order.kaitenAdminDueHasTime !== false,
    kaitenCardTitleLabel: order.kaitenCardTitleLabel,
    kaitenCardType: kaitenCardType,
    isUrgent: order.isUrgent,
    urgentCoefficient: order.urgentCoefficient,
  });

  return {
    kaitenCardId: order.kaitenCardId,
    title,
    description,
    descriptionMirror,
    asap: order.isUrgent === true,
  };
}

async function persistOrderKaitenHeadMirrors(
  orderId: string,
  head: { title: string; descriptionMirror: string | null },
): Promise<void> {
  const prisma = await getOrdersPrisma();
  await prisma.order.update({
    where: { id: orderId },
    data: {
      kaitenCardTitleMirror: head.title,
      kaitenCardDescriptionMirror: head.descriptionMirror,
      kaitenCardTitleManual: false,
      kaitenCardDescriptionManual: false,
    },
  });
}

/** Демо / локальный канбан: пересчитать зеркала шапки из полей наряда без вызова Kaiten API. */
export async function refreshOrderKaitenHeadMirrors(
  orderId: string,
): Promise<{ title: string; descriptionMirror: string | null } | null> {
  const head = await computeKaitenHeadForOrder(orderId);
  if (!head) return null;
  await persistOrderKaitenHeadMirrors(orderId, head);
  return { title: head.title, descriptionMirror: head.descriptionMirror };
}

/**
 * Шапка Kaiten и зеркало в CRM — всегда из полей наряда (наряд главный).
 */
export type KaitenHeadPushResult =
  | { ok: true; title: string; descriptionMirror: string | null }
  | { ok: false; error: string };

/** Обновить Kaiten-шапку у нарядов-родителей при смене связи продолжения. */
export async function pushKaitenHeadForContinuationParents(
  parentOrderIds: Iterable<string | null | undefined>,
): Promise<void> {
  const seen = new Set<string>();
  for (const raw of parentOrderIds) {
    const id = raw?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    try {
      await pushKaitenCardTitleForOrderIfLinked(id);
    } catch (e) {
      console.error("[kaiten] push head for continuation parent", id, e);
    }
  }
}

export async function pushKaitenCardTitleForOrderIfLinked(
  orderId: string,
): Promise<KaitenHeadPushResult> {
  const auth = getKaitenRestAuth();
  const head = await computeKaitenHeadForOrder(orderId);
  if (!head) return { ok: true, title: "", descriptionMirror: null };

  if (!auth || !head.kaitenCardId) {
    await persistOrderKaitenHeadMirrors(orderId, head);
    return {
      ok: true,
      title: head.title,
      descriptionMirror: head.descriptionMirror,
    };
  }

  const res = await kaitenPatchCard(
    auth,
    head.kaitenCardId,
    {
      asap: head.asap,
      title: head.title,
      description: head.description,
    },
    { burst: true },
  );
  if (!res.ok) {
    return {
      ok: false,
      error: res.error ?? `Kaiten HTTP ${res.status}`,
    };
  }

  await persistOrderKaitenHeadMirrors(orderId, head);
  invalidateKaitenSnapshotCache(orderId);
  return {
    ok: true,
    title: head.title,
    descriptionMirror: head.descriptionMirror,
  };
}
