import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import { buildKaitenCardDescription } from "@/lib/kaiten-order-sync";
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

/** Демо / локальный канбан: пересчитать зеркала шапки из полей наряда без вызова Kaiten API. */
export async function refreshOrderKaitenHeadMirrors(orderId: string): Promise<void> {
  const head = await computeKaitenHeadForOrder(orderId);
  if (!head) return;

  const prisma = await getOrdersPrisma();
  await prisma.order.update({
    where: { id: orderId },
    data: {
      kaitenCardTitleMirror: head.title,
      kaitenCardDescriptionMirror: head.descriptionMirror,
    },
  });
}

/**
 * Обновляет в Kaiten заголовок, описание и флаг срочности карточки по актуальным полям наряда
 * (при привязанной карточке), затем синхронизирует зеркала в БД.
 */
export async function pushKaitenCardTitleForOrderIfLinked(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = getKaitenRestAuth();
  if (!auth) return { ok: true };

  const head = await computeKaitenHeadForOrder(orderId);
  if (!head?.kaitenCardId) return { ok: true };

  const patch: Record<string, unknown> = {
    title: head.title,
    description: head.description,
    asap: head.asap,
  };

  const res = await kaitenPatchCard(auth, head.kaitenCardId, patch);
  if (!res.ok) {
    return {
      ok: false,
      error: res.error ?? `Kaiten HTTP ${res.status}`,
    };
  }

  const prisma = await getOrdersPrisma();
  await prisma.order.update({
    where: { id: orderId },
    data: {
      kaitenCardTitleMirror: head.title,
      kaitenCardDescriptionMirror: head.descriptionMirror,
    },
  });

  invalidateKaitenSnapshotCache(orderId);
  return { ok: true };
}
