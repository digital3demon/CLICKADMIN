import {
  Prisma,
  type JawArch,
  type KaitenTrackLane,
  type LabWorkStatus as PrismaLabWorkStatus,
  type OrderCorrectionTrack,
  type OrderPriceListKind,
  type PrismaClient,
} from "@prisma/client";
import { resolvedOrderPriceListKindFromContractors } from "@/lib/order-price-list-from-contractors";
import { buildConstructionCreatesFromInput } from "@/lib/order-construction-input";
import { ensureDoctorClinicLink } from "@/lib/ensure-doctor-clinic-link";
import { isLabWorkStatus, LAB_WORK_STATUS_DEFAULT } from "@/lib/lab-work-status";
import { isAllowedUrgentCoefficient } from "@/lib/order-urgency";
import { recordOrderRevision } from "@/lib/record-order-revision";
import {
  computeNextOrderNumber,
  isPrismaUniqueOrderNumberError,
} from "@/lib/order-number";
import { ensureKaitenDirectory } from "@/lib/kaiten-directory-bootstrap";
import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import { ensureDefaultWarehouse } from "@/lib/inventory/ensure-default-warehouse";
import {
  normalizeProstheticsInput,
  prostheticsToJson,
} from "@/lib/order-prosthetics";
import { syncOrderProstheticsStockTx } from "@/lib/sync-order-prosthetics-stock";
import { auditLogger, logger } from "@/lib/server/logger";
import { getActorForRevision } from "@/lib/actor-from-session";
import { isOrderCorrectionTrack } from "@/lib/order-correction-track";
import { validateContinuesFromOrderId } from "@/lib/order-validate-continuation";
import { resolveClinicIdForDoctorIpOrder } from "@/lib/resolve-order-doctor-ip-clinic";
import {
  canonicalOrderPayment,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PARTIAL,
  ORDER_PAYMENT_RECON_UNPAID,
  isReconciliationPaymentStatus,
} from "@/lib/order-clinic-client-fields";
import { parseOptionalDateTime } from "@/lib/parse-optional-date-time";

const KAITEN_TRACK = new Set<string>([
  "ORTHOPEDICS",
  "ORTHODONTICS",
  "TEST",
]);

const ORDER_INCLUDE = {} as const;

type CreatedOrder = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export type CreateOrderBody = {
  isTestOrder?: boolean;
  clinicId?: string | null;
  doctorId?: string | null;
  patientName?: string | null;
  legalEntity?: string | null;
  payment?: string | null;
  paymentPartialRub?: number | null;
  excludeFromReconciliation?: boolean;
  comments?: string | null;
  clientOrderText?: string | null;
  hasScans?: boolean;
  hasCt?: boolean;
  hasMri?: boolean;
  hasPhoto?: boolean;
  additionalSourceNotes?: string | null;
  isUrgent?: boolean;
  urgentCoefficient?: number | null;
  labWorkStatus?: string;
  quickOrder?: Prisma.JsonValue;
  constructions?: Array<
    | {
        constructionTypeId: string;
        teethFdi: string[];
        quantity?: number;
        unitPrice?: number | null;
        materialId?: string | null;
        shade?: string | null;
      }
    | {
        constructionTypeId: string;
        arch: JawArch;
        quantity?: number;
        unitPrice?: number | null;
        materialId?: string | null;
        shade?: string | null;
      }
    | {
        bridgeFromFdi: string;
        bridgeToFdi: string;
        constructionTypeId?: string | null;
        quantity?: number;
        unitPrice?: number | null;
        materialId?: string | null;
        shade?: string | null;
      }
    | {
        priceListItemId: string;
        quantity?: number;
        unitPrice?: number | null;
        teethFdi?: string[];
        arch?: JawArch;
      }
  >;
  kaitenDecideLater?: boolean;
  /** С kaitenDecideLater: сохранить тип/пространство для доски CRM, карточку Kaiten не создавать */
  createKanbanWithoutKaiten?: boolean;
  kaitenCardTypeId?: string | null;
  kaitenTrackLane?: string;
  /** Для «сохранить и печать»: дождаться карточки Kaiten до генерации PDF с QR. */
  waitForKaitenBeforePrint?: boolean;
  kaitenAdminDueHasTime?: boolean;
  /** false — запись «в течение дня», время не принципиально */
  dueToAdminsHasTime?: boolean;
  kaitenCardTitleLabel?: string | null;
  dueDate?: string | null;
  dueToAdminsAt?: string | null;
  /** Когда работа поступила; null/пусто — только createdAt в CRM */
  workReceivedAt?: string | null;
  prosthetics?: unknown;
  correctionTrack?: string | null;
  correctionReason?: string | null;
  correctionPaid?: boolean;
  continuesFromOrderId?: string | null;
  sourceEmailIds?: string[];
};

export type CreateOrderResult =
  | { ok: true; order: CreatedOrder }
  | { ok: false; status: number; error: string };

/** После успешного create в CRM: отложенный sync с Kaiten (см. POST /api/orders + after). */
export function shouldScheduleKaitenSyncAfterOrderCreate(
  body: CreateOrderBody,
): boolean {
  const isTestOrder = body.isTestOrder === true;
  const kaitenDecideLater = isTestOrder ? true : Boolean(body.kaitenDecideLater);
  return (
    !isTestOrder &&
    !kaitenDecideLater &&
    Boolean(String(body.kaitenCardTypeId ?? "").trim()) &&
    Boolean(String(body.kaitenTrackLane ?? "").trim())
  );
}

function fail(status: number, error: string): CreateOrderResult {
  return { ok: false, status, error };
}

function buildTestOrderNumber(): string {
  const now = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TEST-${now}-${rnd}`;
}

export type CreateOrderOptions = {
  tenantId: string;
  actorUserId?: string | null;
  /** Импорт из Excel: разрешаем исторические даты записи/срока. */
  allowPastDates?: boolean;
};

export type CreateOrderDb = {
  ordersPrisma: PrismaClient;
  clientsPrisma: PrismaClient;
  pricingPrisma: PrismaClient;
};

export async function createOrderFromBody(
  db: CreateOrderDb,
  body: CreateOrderBody,
  opts: CreateOrderOptions,
): Promise<CreateOrderResult> {
  const { ordersPrisma, clientsPrisma, pricingPrisma } = db;
  const { tenantId, allowPastDates = false, actorUserId = null } = opts;
  const isTestOrder = body.isTestOrder === true;
  let doctorId = body.doctorId?.trim() ?? "";
  if (isTestOrder && !doctorId) {
    const fallbackDoctor = await clientsPrisma.doctor.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: [{ createdAt: "desc" }],
      select: { id: true },
    });
    doctorId = fallbackDoctor?.id ?? "";
  }
  if (!doctorId) {
    return fail(
      400,
      isTestOrder
        ? "Нет доступного врача для тестового наряда. Добавьте хотя бы одного врача."
        : "Укажите врача",
    );
  }

  const rawClinic = body.clinicId;
  const isPrivate =
    rawClinic === null ||
    rawClinic === undefined ||
    (typeof rawClinic === "string" && rawClinic.trim() === "");
  const legalForResolver = (() => {
    const s = (body.legalEntity ?? "").trim();
    return s || null;
  })();

  const labRaw = body.labWorkStatus ?? LAB_WORK_STATUS_DEFAULT;
  if (!isLabWorkStatus(labRaw)) return fail(400, "Некорректный этап работы");
  const labWorkStatus = labRaw as PrismaLabWorkStatus;

  const isUrgent = Boolean(body.isUrgent);
  let urgent: number | null = null;
  if (isUrgent && body.urgentCoefficient != null) {
    const u = Number(body.urgentCoefficient);
    if (Number.isNaN(u) || !isAllowedUrgentCoefficient(u)) {
      return fail(400, "Допустимые коэффициенты срочности: 1.2, 1.5, 2, 3");
    }
    urgent = u;
  }

  const doctor = await clientsPrisma.doctor.findFirst({
    where: { id: doctorId, tenantId },
    select: {
      id: true,
      deletedAt: true,
      orderPriceListKind: true,
    },
  });
  if (!doctor) return fail(400, "Врач не найден");
  if (doctor.deletedAt) {
    return fail(
      400,
      "Врач удалён из конфигурации. Восстановите его в «Клиенты → История и удалённые».",
    );
  }

  const requestedClinicId = isPrivate ? null : String(rawClinic).trim();
  const rClinic = await resolveClinicIdForDoctorIpOrder(clientsPrisma, {
    tenantId,
    doctorId,
    requestedClinicId,
    legalEntity: legalForResolver,
  });
  if (!rClinic.ok) return fail(400, rClinic.error);

  let resolvedClinicId: string | null = rClinic.clinicId;
  if (resolvedClinicId) {
    const linked = await ensureDoctorClinicLink(
      clientsPrisma,
      doctorId,
      resolvedClinicId,
    );
    if (!linked.ok) return fail(400, linked.error);
  }

  let clinicPriceListKind: OrderPriceListKind | null = null;
  let clinicWorksWithReconciliation = false;
  if (resolvedClinicId) {
    const c = await clientsPrisma.clinic.findUnique({
      where: { id: resolvedClinicId },
      select: { orderPriceListKind: true, worksWithReconciliation: true },
    });
    clinicPriceListKind = c?.orderPriceListKind ?? null;
    clinicWorksWithReconciliation = c?.worksWithReconciliation === true;
  }
  const orderPriceListKind = resolvedOrderPriceListKindFromContractors({
    clinicId: resolvedClinicId,
    doctorKind: doctor.orderPriceListKind,
    clinicKind: clinicPriceListKind,
  });

  const patientTrim = body.patientName?.trim() || null;
  let continuesFromOrderId: string | null = null;
  const rawContinuation = body.continuesFromOrderId?.trim();
  if (rawContinuation) {
    const v = await validateContinuesFromOrderId(ordersPrisma, {
      continuesFromOrderId: rawContinuation,
      doctorId,
      patientName: patientTrim ?? "",
    });
    if (!v.ok) return fail(400, v.error);
    continuesFromOrderId = rawContinuation;
  }

  const kaitenDecideLater = isTestOrder ? true : Boolean(body.kaitenDecideLater);
  const createKanbanWithoutKaiten = isTestOrder
    ? true
    : kaitenDecideLater && Boolean(body.createKanbanWithoutKaiten);
  /** Тип/пространство для Kaiten-синка или только для CRM-канбана при «канбан без Kaiten». */
  const needKaitenPlacementFields =
    !isTestOrder && (!kaitenDecideLater || createKanbanWithoutKaiten);
  let kaitenCardTypeId: string | null = null;
  let kaitenTrackLane: KaitenTrackLane | null = null;
  let dueToAdminsAt: Date | null = null;
  let kaitenAdminDueHasTime = true;

  if (needKaitenPlacementFields) {
    await ensureKaitenDirectory(clientsPrisma, tenantId);
    const kc = body.kaitenCardTypeId?.trim() ?? "";
    const kt = body.kaitenTrackLane;
    if (!kc || !kt) {
      return fail(
        400,
        "Укажите тип карточки Кайтен и пространство или отметьте «Решу позже»",
      );
    }
    if (!KAITEN_TRACK.has(kt)) return fail(400, "Некорректное пространство Кайтен");

    const cardType = await clientsPrisma.kaitenCardType.findFirst({
      where: { id: kc, isActive: true, tenantId },
    });
    if (!cardType) return fail(400, "Неизвестный тип карточки Кайтен");

    kaitenCardTypeId = cardType.id;
    kaitenTrackLane = kt as KaitenTrackLane;
    const kaitenCfg0 = getKaitenEnvConfig();
    if (!kaitenCfg0?.boardByLane[kaitenTrackLane]) {
      return fail(
        400,
        "Выбранное пространство Кайтен не настроено: в .env задайте KAITEN_*_BOARD_ID или KAITEN_*_SPACE_ID (число из URL …/space/ЧИСЛО/…) и KAITEN_*_COLUMN_TO_EXECUTION_ID.",
      );
    }

    if (!createKanbanWithoutKaiten) {
      const kaitenCfg = await withResolvedKaitenBoards(kaitenCfg0);
      const laneTarget = kaitenCfg.boardByLane[kaitenTrackLane];
      if (laneTarget?.boardId == null) {
        return fail(
          400,
          "Не удалось получить id доски Kaiten для этого пространства (GET /spaces/{id}/boards). Проверьте KAITEN_*_SPACE_ID и KAITEN_API_TOKEN.",
        );
      }
    }
  }

  dueToAdminsAt = parseOptionalDateTime(body.dueToAdminsAt);
  if (!isTestOrder && !dueToAdminsAt) return fail(400, "Укажите дату записи (Запись)");
  kaitenAdminDueHasTime = body.kaitenAdminDueHasTime !== false;
  const dueToAdminsHasTime = body.dueToAdminsHasTime !== false;

  const dueDate = parseOptionalDateTime(body.dueDate);
  const serverNow = new Date();
  const workReceivedAt = parseOptionalDateTime(body.workReceivedAt);
  if (workReceivedAt && workReceivedAt.getTime() > serverNow.getTime()) {
    return fail(400, "Дата поступления работы не может быть в будущем");
  }
  if (!isTestOrder && !allowPastDates && dueDate && dueDate.getTime() < serverNow.getTime()) {
    return fail(
      400,
      "Срок лабораторный не может быть в прошлом относительно момента сохранения наряда",
    );
  }
  if (
    !isTestOrder &&
    !allowPastDates &&
    dueToAdminsAt &&
    dueToAdminsAt.getTime() < serverNow.getTime()
  ) {
    return fail(
      400,
      "Дата записи (Запись) не может быть в прошлом относительно момента сохранения наряда",
    );
  }

  const normalizedProsthetics = normalizeProstheticsInput(body.prosthetics);
  const prostheticsPrisma = prostheticsToJson(normalizedProsthetics);

  const requestedPaymentRaw = body.payment?.trim() || null;
  const requestedPayment =
    requestedPaymentRaw != null
      ? canonicalOrderPayment(requestedPaymentRaw)
      : null;
  const payment =
    clinicWorksWithReconciliation
      ? ORDER_PAYMENT_RECON_UNPAID
      : requestedPayment == null || isReconciliationPaymentStatus(requestedPayment)
        ? ORDER_PAYMENT_NOT_PAID
        : requestedPayment;
  let paymentPartialRub: number | null = null;
  if (payment === ORDER_PAYMENT_PARTIAL) {
    const n = Number(body.paymentPartialRub);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 99_999_999) {
      return fail(400, "Для частичной оплаты укажите сумму (целые рубли)");
    }
    paymentPartialRub = n;
  }

  let correctionTrack: OrderCorrectionTrack | null = null;
  if (
    body.correctionTrack !== undefined &&
    body.correctionTrack !== null &&
    String(body.correctionTrack).trim() !== ""
  ) {
    const r = String(body.correctionTrack).trim();
    if (!isOrderCorrectionTrack(r)) return fail(400, "Некорректное направление коррекции");
    correctionTrack = r as OrderCorrectionTrack;
  }
  const reworkAtCustomerExpense = false;
  const correctionPaid =
    correctionTrack != null ? Boolean(body.correctionPaid) : false;
  const correctionReason =
    correctionTrack != null
      ? String(body.correctionReason ?? "").trim().slice(0, 4000) || null
      : null;

  let constructionCreates: Prisma.OrderConstructionCreateWithoutOrderInput[] = [];
  if (body.constructions !== undefined) {
    const built = await buildConstructionCreatesFromInput(pricingPrisma, body.constructions, {
      clinicId: resolvedClinicId,
      doctorId,
    });
    if (!built.ok) return fail(built.err.status, built.err.error);
    constructionCreates = built.creates;
  }

  const revisionActor = await getActorForRevision();
  const orderCreateData = {
    tenantId,
    clinicId: resolvedClinicId,
    doctorId,
    patientName: patientTrim,
    continuesFromOrderId,
    dueDate,
    dueToAdminsAt,
    workReceivedAt,
    notes: body.comments?.trim() || null,
    clientOrderText:
      body.clientOrderText === undefined
        ? null
        : String(body.clientOrderText ?? "").trim() || null,
    legalEntity: body.legalEntity?.trim() || null,
    orderPriceListKind,
    payment,
    paymentPartialRub,
    excludeFromReconciliation: Boolean(body.excludeFromReconciliation),
    excludeFromReconciliationUntil: null,
    shade: null,
    /** Синхронно с датой приёма в форме (dueToAdminsAt); для отгрузок и CRM. */
    appointmentDate: dueToAdminsAt,
    hasScans: Boolean(body.hasScans),
    hasCt: Boolean(body.hasCt),
    hasMri: Boolean(body.hasMri),
    hasPhoto: Boolean(body.hasPhoto),
    additionalSourceNotes:
      body.additionalSourceNotes === undefined
        ? null
        : String(body.additionalSourceNotes ?? "").trim() || null,
    isUrgent,
    urgentCoefficient: isUrgent ? urgent : null,
    labWorkStatus,
    quickOrder:
      body.quickOrder === undefined
        ? undefined
        : (body.quickOrder as Prisma.InputJsonValue),
    kaitenDecideLater,
    createKanbanWithoutKaiten,
    kaitenCardTypeId: needKaitenPlacementFields ? kaitenCardTypeId : null,
    kaitenTrackLane: needKaitenPlacementFields ? kaitenTrackLane : null,
    kaitenAdminDueHasTime,
    dueToAdminsHasTime,
    kaitenCardTitleLabel: needKaitenPlacementFields
      ? body.kaitenCardTitleLabel?.trim() || null
      : null,
    constructions:
      constructionCreates.length > 0 ? { create: constructionCreates } : undefined,
    ...(prostheticsPrisma === Prisma.JsonNull ? {} : { prosthetics: prostheticsPrisma }),
    registeredByLabel: revisionActor.label,
    correctionTrack,
    correctionReason,
    correctionPaid,
    reworkAtCustomerExpense,
    isTestOrder,
    testOrderOwnerUserId: isTestOrder ? actorUserId : null,
  };

  let order: CreatedOrder | null = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const orderNumber = isTestOrder
      ? buildTestOrderNumber()
      : await computeNextOrderNumber(ordersPrisma, tenantId);
    try {
      order = await ordersPrisma.order.create({
        data: { ...orderCreateData, orderNumber },
        include: ORDER_INCLUDE,
      });
      break;
    } catch (e) {
      if (isPrismaUniqueOrderNumberError(e) && attempt < 11) continue;
      throw e;
    }
  }

  if (!order) {
    return fail(
      500,
      isTestOrder
        ? "Не удалось создать тестовый наряд"
        : "Не удалось выделить уникальный номер наряда",
    );
  }

  const warehouse = await ensureDefaultWarehouse();
  const stockSync = await pricingPrisma.$transaction(async (tx) =>
    syncOrderProstheticsStockTx(tx, order.id, warehouse.id, null, normalizedProsthetics),
  );
  if (!stockSync.ok) {
    try {
      await ordersPrisma.order.delete({ where: { id: order.id } });
    } catch (delErr) {
      logger.error(
        { err: delErr, msg: "order_rollback_after_stock_sync" },
        "createOrderFromBody",
      );
    }
    return fail(400, stockSync.error);
  }

  try {
    await recordOrderRevision(order.id, { kind: "CREATE" });
  } catch (e) {
    logger.error({ err: e, msg: "order_revision_log" }, "createOrderFromBody");
  }

  const sourceEmailIds = Array.isArray(body.sourceEmailIds)
    ? Array.from(
        new Set(
          body.sourceEmailIds
            .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
            .map((id) => id.trim()),
        ),
      ).slice(0, 20)
    : [];
  if (sourceEmailIds.length > 0) {
    try {
      const emails = await ordersPrisma.email.findMany({
        where: { tenantId, id: { in: sourceEmailIds } },
        select: { id: true },
      });
      if (emails.length > 0) {
        await ordersPrisma.emailSourceOrder.createMany({
          data: emails.map((email) => ({
            tenantId,
            orderId: order.id,
            emailId: email.id,
          })),
          skipDuplicates: true,
        });
      }
    } catch (e) {
      logger.error({ err: e, orderId: order.id, sourceEmailIds }, "order_source_email_link_failed");
    }
  }

  auditLogger.info({
    action: "order.create",
    orderId: order.id,
    orderNumber: order.orderNumber,
    ...(continuesFromOrderId ? { continuesFromOrderId } : {}),
  });

  return { ok: true, order };
}
