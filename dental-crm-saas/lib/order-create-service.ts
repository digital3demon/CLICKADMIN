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
import { syncNewOrderToKaiten } from "@/lib/kaiten-order-sync";
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
import { isCommercialBuild } from "@/lib/crm-build";

const KAITEN_TRACK = new Set<string>([
  "ORTHOPEDICS",
  "ORTHODONTICS",
  "TEST",
]);

const ORDER_INCLUDE = {
  clinic: { select: { name: true } },
  doctor: { select: { fullName: true } },
} as const;

type CreatedOrder = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export type CreateOrderBody = {
  clinicId?: string | null;
  doctorId?: string;
  patientName?: string | null;
  legalEntity?: string | null;
  payment?: string | null;
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
  kaitenCardTypeId?: string | null;
  kaitenTrackLane?: string;
  kaitenAdminDueHasTime?: boolean;
  kaitenCardTitleLabel?: string | null;
  dueDate?: string | null;
  dueToAdminsAt?: string | null;
  /** Когда работа поступила; null/пусто — только createdAt в CRM */
  workReceivedAt?: string | null;
  prosthetics?: unknown;
  correctionTrack?: string | null;
  continuesFromOrderId?: string | null;
};

export type CreateOrderResult =
  | { ok: true; order: CreatedOrder }
  | { ok: false; status: number; error: string };

function fail(status: number, error: string): CreateOrderResult {
  return { ok: false, status, error };
}

function parseOptionalDateTime(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export type CreateOrderOptions = {
  tenantId: string;
};

export async function createOrderFromBody(
  prisma: PrismaClient,
  body: CreateOrderBody,
  opts: CreateOrderOptions,
): Promise<CreateOrderResult> {
  const { tenantId } = opts;
  const doctorId = body.doctorId?.trim() ?? "";
  if (!doctorId) return fail(400, "Укажите врача");

  const rawClinic = body.clinicId;
  const isPrivate =
    rawClinic === null ||
    rawClinic === undefined ||
    (typeof rawClinic === "string" && rawClinic.trim() === "");

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

  const doctor = await prisma.doctor.findFirst({
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

  let resolvedClinicId: string | null = null;
  if (!isPrivate) {
    const cid = String(rawClinic).trim();
    const linked = await ensureDoctorClinicLink(prisma, doctorId, cid);
    if (!linked.ok) return fail(400, linked.error);
    resolvedClinicId = cid;
  }

  let clinicPriceListKind: OrderPriceListKind | null = null;
  if (resolvedClinicId) {
    const c = await prisma.clinic.findUnique({
      where: { id: resolvedClinicId },
      select: { orderPriceListKind: true },
    });
    clinicPriceListKind = c?.orderPriceListKind ?? null;
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
    const v = await validateContinuesFromOrderId(prisma, {
      continuesFromOrderId: rawContinuation,
      doctorId,
      clinicId: resolvedClinicId,
      patientName: patientTrim ?? "",
    });
    if (!v.ok) return fail(400, v.error);
    continuesFromOrderId = rawContinuation;
  }

  const kaitenDecideLater = Boolean(body.kaitenDecideLater) || isCommercialBuild();
  let kaitenCardTypeId: string | null = null;
  let kaitenTrackLane: KaitenTrackLane | null = null;
  let dueToAdminsAt: Date | null = null;
  let kaitenAdminDueHasTime = true;

  if (!kaitenDecideLater) {
    await ensureKaitenDirectory(prisma, tenantId);
    const kc = body.kaitenCardTypeId?.trim() ?? "";
    const kt = body.kaitenTrackLane;
    if (!kc || !kt) {
      return fail(
        400,
        "Укажите тип карточки Кайтен и пространство или отметьте «Решу позже»",
      );
    }
    if (!KAITEN_TRACK.has(kt)) return fail(400, "Некорректное пространство Кайтен");

    const cardType = await prisma.kaitenCardType.findFirst({
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

    const kaitenCfg = await withResolvedKaitenBoards(kaitenCfg0);
    const laneTarget = kaitenCfg.boardByLane[kaitenTrackLane];
    if (laneTarget?.boardId == null) {
      return fail(
        400,
        "Не удалось получить id доски Kaiten для этого пространства (GET /spaces/{id}/boards). Проверьте KAITEN_*_SPACE_ID и KAITEN_API_TOKEN.",
      );
    }
  }

  dueToAdminsAt = parseOptionalDateTime(body.dueToAdminsAt);
  if (!dueToAdminsAt) return fail(400, "Укажите дату записи (Запись)");
  kaitenAdminDueHasTime = body.kaitenAdminDueHasTime !== false;

  const dueDate = parseOptionalDateTime(body.dueDate);
  const serverNow = new Date();
  const workReceivedAt = parseOptionalDateTime(body.workReceivedAt);
  if (workReceivedAt && workReceivedAt.getTime() > serverNow.getTime()) {
    return fail(400, "Дата поступления работы не может быть в будущем");
  }
  if (dueDate && dueDate.getTime() < serverNow.getTime()) {
    return fail(
      400,
      "Срок лабораторный не может быть в прошлом относительно момента сохранения наряда",
    );
  }
  if (dueToAdminsAt && dueToAdminsAt.getTime() < serverNow.getTime()) {
    return fail(
      400,
      "Дата записи (Запись) не может быть в прошлом относительно момента сохранения наряда",
    );
  }

  const normalizedProsthetics = normalizeProstheticsInput(body.prosthetics);
  const prostheticsPrisma = prostheticsToJson(normalizedProsthetics);

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

  let constructionCreates: Prisma.OrderConstructionCreateWithoutOrderInput[] = [];
  if (body.constructions !== undefined) {
    const built = await buildConstructionCreatesFromInput(prisma, body.constructions);
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
    payment: body.payment?.trim() || null,
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
    kaitenCardTypeId: kaitenDecideLater ? null : kaitenCardTypeId,
    kaitenTrackLane: kaitenDecideLater ? null : kaitenTrackLane,
    kaitenAdminDueHasTime: kaitenDecideLater ? true : kaitenAdminDueHasTime,
    kaitenCardTitleLabel: kaitenDecideLater
      ? null
      : (body.kaitenCardTitleLabel?.trim() || null),
    constructions:
      constructionCreates.length > 0 ? { create: constructionCreates } : undefined,
    ...(prostheticsPrisma === Prisma.JsonNull ? {} : { prosthetics: prostheticsPrisma }),
    registeredByLabel: revisionActor.label,
    correctionTrack,
  };

  let order: CreatedOrder | null = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const orderNumber = await computeNextOrderNumber(prisma, tenantId);
    try {
      order = await prisma.order.create({
        data: { ...orderCreateData, orderNumber },
        include: ORDER_INCLUDE,
      });
      break;
    } catch (e) {
      if (isPrismaUniqueOrderNumberError(e) && attempt < 11) continue;
      throw e;
    }
  }

  if (!order) return fail(500, "Не удалось выделить уникальный номер наряда");

  const warehouse = await ensureDefaultWarehouse();
  const stockSync = await prisma.$transaction(async (tx) =>
    syncOrderProstheticsStockTx(tx, order.id, warehouse.id, null, normalizedProsthetics),
  );
  if (!stockSync.ok) {
    try {
      await prisma.order.delete({ where: { id: order.id } });
    } catch (delErr) {
      logger.error(
        { err: delErr, msg: "order_rollback_after_stock_sync" },
        "createOrderFromBody",
      );
    }
    return fail(400, stockSync.error);
  }

  if (!kaitenDecideLater && kaitenCardTypeId && kaitenTrackLane) {
    try {
      await syncNewOrderToKaiten(order.id);
    } catch (e) {
      logger.error({ err: e, msg: "kaiten_sync_after_create" }, "createOrderFromBody");
    }
  }

  try {
    await recordOrderRevision(order.id, { kind: "CREATE" });
  } catch (e) {
    logger.error({ err: e, msg: "order_revision_log" }, "createOrderFromBody");
  }

  auditLogger.info({
    action: "order.create",
    orderId: order.id,
    orderNumber: order.orderNumber,
    ...(continuesFromOrderId ? { continuesFromOrderId } : {}),
  });

  return { ok: true, order };
}
