import {
  OrderPriceListKind,
  type Order,
  type OrderConstruction,
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import { clearDoctorClinicLinkSuppression } from "@/lib/doctor-clinic-link-suppression";
import { buildConstructionCreatesFromInput } from "@/lib/order-construction-input";

export const ORDER_SNAPSHOT_VERSION = 1 as const;

export type OrderSnapshotV1 = {
  v: typeof ORDER_SNAPSHOT_VERSION;
  order: {
    clinicId: string | null;
    doctorId: string;
    patientName: string | null;
    appointmentDate: string | null;
    dueDate: string | null;
    dueToAdminsAt: string | null;
    status: string;
    notes: string | null;
    /** В старых снимках отсутствует */
    clientOrderText?: string | null;
    isUrgent: boolean;
    urgentCoefficient: number | null;
    labWorkStatus: string;
    legalEntity: string | null;
    payment: string | null;
    shade: string | null;
    hasScans: boolean;
    hasCt: boolean;
    hasMri: boolean;
    hasPhoto: boolean;
    /** В старых снимках отсутствует */
    additionalSourceNotes?: string | null;
    quickOrder: Prisma.JsonValue | null;
    invoiceIssued: boolean;
    /** В старых снимках отсутствует */
    invoiceNumber?: string | null;
    invoicePaperDocs?: boolean;
    invoiceSentToEdo?: boolean;
    invoiceEdoSigned?: boolean;
    /** В старых снимках отсутствует */
    invoicePrinted?: boolean;
    narjadPrinted?: boolean;
    adminShippedOtpr?: boolean;
    shippedDescription?: string | null;
    invoiceParsedLines?: Prisma.JsonValue | null;
    invoiceParsedTotalRub?: number | null;
    invoiceParsedSummaryText?: string | null;
    invoicePaymentNotes?: string | null;
    orderPriceListKind?: string | null;
    orderPriceListNote?: string | null;
    prostheticsOrdered?: boolean;
    correctionTrack?: string | null;
    reworkAtCustomerExpense?: boolean;
    registeredByLabel?: string | null;
    courierId?: string | null;
    /** С v2 курьеров раздельно; в старых снимках нет — восстановление из courierId */
    courierPickupId?: string | null;
    courierDeliveryId?: string | null;
    invoiceAttachmentId?: string | null;
    kaitenDecideLater: boolean;
    /** в старых снимках не было — только kaitenAssignmentType */
    kaitenCardTypeId?: string | null;
    kaitenTrackLane: string | null;
    kaitenAdminDueHasTime?: boolean;
    /** с v2 снимков всегда есть; в старых снимках отсутствует */
    kaitenCardTitleLabel?: string | null;
    kaitenCardId: number | null;
    kaitenSyncError: string | null;
    kaitenSyncedAt: string | null;
    /** В старых снимках отсутствует */
    kaitenColumnTitle?: string | null;
    /** В старых снимках отсутствует */
    kaitenBlocked?: boolean;
    /** В старых снимках отсутствует */
    kaitenBlockReason?: string | null;
  };
  constructions: Array<{
    category: string;
    constructionTypeId: string | null;
    priceListItemId?: string | null;
    materialId: string | null;
    shade: string | null;
    quantity: number;
    unitPrice: number | null;
    teethFdi: unknown;
    bridgeFromFdi: string | null;
    bridgeToFdi: string | null;
    arch: string | null;
  }>;
  /** В старых снимках отсутствует */
  prosthetics?: Prisma.JsonValue | null;
};

export function buildSnapshotFromOrder(
  order: Order & { constructions: OrderConstruction[] },
): OrderSnapshotV1 {
  return {
    v: ORDER_SNAPSHOT_VERSION,
    order: {
      clinicId: order.clinicId,
      doctorId: order.doctorId,
      patientName: order.patientName,
      appointmentDate: order.appointmentDate?.toISOString() ?? null,
      dueDate: order.dueDate?.toISOString() ?? null,
      dueToAdminsAt: order.dueToAdminsAt?.toISOString() ?? null,
      status: order.status,
      notes: order.notes,
      clientOrderText: order.clientOrderText ?? null,
      isUrgent: order.isUrgent,
      urgentCoefficient: order.urgentCoefficient,
      labWorkStatus: order.labWorkStatus,
      legalEntity: order.legalEntity,
      payment: order.payment,
      shade: order.shade,
      hasScans: order.hasScans,
      hasCt: order.hasCt,
      hasMri: order.hasMri,
      hasPhoto: order.hasPhoto,
      additionalSourceNotes: order.additionalSourceNotes ?? null,
      quickOrder:
        order.quickOrder === null || order.quickOrder === undefined
          ? null
          : (order.quickOrder as Prisma.JsonValue),
      invoiceIssued: order.invoiceIssued,
      invoiceNumber: order.invoiceNumber ?? null,
      invoicePaperDocs: order.invoicePaperDocs,
      invoiceSentToEdo: order.invoiceSentToEdo,
      invoiceEdoSigned: order.invoiceEdoSigned,
      invoicePrinted: order.invoicePrinted,
      narjadPrinted: order.narjadPrinted,
      adminShippedOtpr: order.adminShippedOtpr,
      shippedDescription: order.shippedDescription ?? null,
      invoiceParsedLines:
        order.invoiceParsedLines === null ||
        order.invoiceParsedLines === undefined
          ? null
          : (order.invoiceParsedLines as Prisma.JsonValue),
      invoiceParsedTotalRub: order.invoiceParsedTotalRub ?? null,
      invoiceParsedSummaryText: order.invoiceParsedSummaryText ?? null,
      invoicePaymentNotes: order.invoicePaymentNotes ?? null,
      orderPriceListKind: order.orderPriceListKind ?? null,
      orderPriceListNote: order.orderPriceListNote ?? null,
      prostheticsOrdered: order.prostheticsOrdered,
      correctionTrack: order.correctionTrack ?? null,
      reworkAtCustomerExpense: order.reworkAtCustomerExpense,
      registeredByLabel: order.registeredByLabel ?? null,
      courierId: order.courierId ?? null,
      courierPickupId: order.courierPickupId ?? null,
      courierDeliveryId: order.courierDeliveryId ?? null,
      invoiceAttachmentId: order.invoiceAttachmentId ?? null,
      kaitenDecideLater: order.kaitenDecideLater,
      kaitenCardTypeId: order.kaitenCardTypeId,
      kaitenTrackLane: order.kaitenTrackLane,
      kaitenAdminDueHasTime: order.kaitenAdminDueHasTime,
      kaitenCardTitleLabel: order.kaitenCardTitleLabel,
      kaitenCardId: order.kaitenCardId,
      kaitenSyncError: order.kaitenSyncError,
      kaitenSyncedAt: order.kaitenSyncedAt?.toISOString() ?? null,
      kaitenColumnTitle: order.kaitenColumnTitle ?? null,
      kaitenBlocked: order.kaitenBlocked,
      kaitenBlockReason: order.kaitenBlockReason ?? null,
    },
    constructions: order.constructions.map((c) => ({
      category: c.category,
      constructionTypeId: c.constructionTypeId,
      priceListItemId: c.priceListItemId,
      materialId: c.materialId,
      shade: c.shade,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      teethFdi: c.teethFdi,
      bridgeFromFdi: c.bridgeFromFdi,
      bridgeToFdi: c.bridgeToFdi,
      arch: c.arch,
    })),
    prosthetics:
      order.prosthetics === null || order.prosthetics === undefined
        ? null
        : (order.prosthetics as Prisma.JsonValue),
  };
}

export function parseSnapshotV1(raw: unknown): OrderSnapshotV1 | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as { v?: unknown; order?: unknown; constructions?: unknown };
  if (o.v !== ORDER_SNAPSHOT_VERSION) return null;
  if (!o.order || typeof o.order !== "object") return null;
  if (!Array.isArray(o.constructions)) return null;
  return raw as OrderSnapshotV1;
}

async function assertRestoreDoctorClinic(
  db: PrismaClient,
  doctorId: string,
  clinicId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true },
  });
  if (!doctor) {
    return { ok: false, error: "Врач не найден" };
  }
  if (clinicId === null) {
    return { ok: true };
  }
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true },
  });
  if (!clinic) {
    return { ok: false, error: "Клиника из версии не найдена" };
  }
  await clearDoctorClinicLinkSuppression(db, doctorId, clinicId);
  await db.doctorOnClinic.upsert({
    where: {
      doctorId_clinicId: { doctorId, clinicId },
    },
    create: { doctorId, clinicId },
    update: {},
  });
  return { ok: true };
}

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/**
 * Восстанавливает наряд из снимка (поля + позиции). Вложения не трогает.
 */
export async function applyOrderSnapshot(
  prisma: PrismaClient,
  orderId: string,
  snapshot: OrderSnapshotV1,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const o = snapshot.order;
  const allowed = await assertRestoreDoctorClinic(prisma, o.doctorId, o.clinicId);
  if (!allowed.ok) {
    return allowed;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const built = await buildConstructionCreatesFromInput(
        tx as unknown as PrismaClient,
        snapshot.constructions,
      );
      if (!built.ok) {
        throw new Error(built.err.error);
      }

      const quickPayload =
        o.quickOrder === null
          ? Prisma.JsonNull
          : (o.quickOrder as Prisma.InputJsonValue);

      await (tx as Tx).order.update({
        where: { id: orderId },
        data: {
          clinic: o.clinicId
            ? { connect: { id: o.clinicId } }
            : { disconnect: true },
          doctor: { connect: { id: o.doctorId } },
          patientName: o.patientName,
          appointmentDate: o.appointmentDate
            ? new Date(o.appointmentDate)
            : null,
          dueDate: o.dueDate ? new Date(o.dueDate) : null,
          dueToAdminsAt: o.dueToAdminsAt
            ? new Date(o.dueToAdminsAt)
            : null,
          status: o.status as never,
          notes: o.notes,
          clientOrderText:
            "clientOrderText" in o ? (o.clientOrderText ?? null) : null,
          isUrgent: o.isUrgent,
          urgentCoefficient: o.urgentCoefficient,
          labWorkStatus: o.labWorkStatus as never,
          legalEntity: o.legalEntity,
          payment: o.payment,
          shade: o.shade,
          hasScans: o.hasScans,
          hasCt: o.hasCt,
          hasMri: o.hasMri,
          hasPhoto: o.hasPhoto,
          additionalSourceNotes:
            "additionalSourceNotes" in o
              ? (o.additionalSourceNotes ?? null)
              : null,
          quickOrder: quickPayload,
          invoiceIssued: o.invoiceIssued,
          invoiceNumber: "invoiceNumber" in o ? (o.invoiceNumber ?? null) : null,
          invoicePaperDocs: "invoicePaperDocs" in o ? Boolean(o.invoicePaperDocs) : false,
          invoiceSentToEdo: "invoiceSentToEdo" in o ? Boolean(o.invoiceSentToEdo) : false,
          invoiceEdoSigned: "invoiceEdoSigned" in o ? Boolean(o.invoiceEdoSigned) : false,
          invoicePrinted: "invoicePrinted" in o ? Boolean(o.invoicePrinted) : false,
          narjadPrinted: "narjadPrinted" in o ? Boolean(o.narjadPrinted) : false,
          adminShippedOtpr: "adminShippedOtpr" in o ? Boolean(o.adminShippedOtpr) : false,
          shippedDescription:
            "shippedDescription" in o ? (o.shippedDescription ?? null) : null,
          invoiceParsedLines:
            "invoiceParsedLines" in o && o.invoiceParsedLines != null
              ? (o.invoiceParsedLines as Prisma.InputJsonValue)
              : Prisma.DbNull,
          invoiceParsedTotalRub:
            "invoiceParsedTotalRub" in o && o.invoiceParsedTotalRub != null
              ? Number(o.invoiceParsedTotalRub)
              : null,
          invoiceParsedSummaryText:
            "invoiceParsedSummaryText" in o
              ? (o.invoiceParsedSummaryText ?? null)
              : null,
          invoicePaymentNotes:
            "invoicePaymentNotes" in o ? (o.invoicePaymentNotes ?? null) : null,
          orderPriceListKind:
            "orderPriceListKind" in o && o.orderPriceListKind
              ? String(o.orderPriceListKind).toUpperCase() === "MAIN"
                ? OrderPriceListKind.MAIN
                : OrderPriceListKind.CUSTOM
              : null,
          orderPriceListNote:
            "orderPriceListNote" in o ? (o.orderPriceListNote ?? null) : null,
          prostheticsOrdered: "prostheticsOrdered" in o ? Boolean(o.prostheticsOrdered) : false,
          correctionTrack:
            "correctionTrack" in o && o.correctionTrack
              ? (o.correctionTrack as never)
              : null,
          reworkAtCustomerExpense:
            "reworkAtCustomerExpense" in o
              ? Boolean(o.reworkAtCustomerExpense)
              : false,
          registeredByLabel:
            "registeredByLabel" in o ? (o.registeredByLabel ?? null) : null,
          courier:
            "courierId" in o && o.courierId
              ? { connect: { id: o.courierId } }
              : { disconnect: true },
          courierPickup:
            "courierPickupId" in o && o.courierPickupId
              ? { connect: { id: o.courierPickupId } }
              : "courierId" in o && o.courierId
                ? { connect: { id: o.courierId } }
                : { disconnect: true },
          courierDelivery:
            "courierDeliveryId" in o && o.courierDeliveryId
              ? { connect: { id: o.courierDeliveryId } }
              : { disconnect: true },
          invoiceAttachment:
            "invoiceAttachmentId" in o && o.invoiceAttachmentId
              ? { connect: { id: o.invoiceAttachmentId } }
              : { disconnect: true },
          kaitenDecideLater: o.kaitenDecideLater,
          kaitenCardType:
            "kaitenCardTypeId" in o && o.kaitenCardTypeId
              ? { connect: { id: o.kaitenCardTypeId } }
              : { disconnect: true },
          kaitenTrackLane: o.kaitenTrackLane as never,
          kaitenAdminDueHasTime: o.kaitenAdminDueHasTime ?? true,
          kaitenCardTitleLabel: o.kaitenCardTitleLabel ?? null,
          kaitenCardId: o.kaitenCardId,
          kaitenSyncError: o.kaitenSyncError,
          kaitenSyncedAt: o.kaitenSyncedAt
            ? new Date(o.kaitenSyncedAt)
            : null,
          ...("kaitenColumnTitle" in o
            ? { kaitenColumnTitle: o.kaitenColumnTitle ?? null }
            : {}),
          ...("kaitenBlocked" in o
            ? { kaitenBlocked: Boolean(o.kaitenBlocked) }
            : {}),
          ...("kaitenBlockReason" in o
            ? { kaitenBlockReason: o.kaitenBlockReason ?? null }
            : {}),
          constructions: {
            deleteMany: {},
            create: built.creates,
          },
          ...(snapshot.prosthetics !== undefined
            ? {
                prosthetics:
                  snapshot.prosthetics === null
                    ? Prisma.JsonNull
                    : (snapshot.prosthetics as Prisma.InputJsonValue),
              }
            : {}),
        },
      });
    });
    return { ok: true };
  } catch (e) {
    console.error("[applyOrderSnapshot]", e);
    const msg = e instanceof Error ? e.message : "Ошибка восстановления";
    return { ok: false, error: msg };
  }
}
