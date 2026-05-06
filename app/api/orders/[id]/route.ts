import {
  DemoKanbanColumn,
  Prisma,
  type LabWorkStatus as PrismaLabWorkStatus,
  type OrderCorrectionTrack,
  type OrderStatus as PrismaOrderStatus,
  type PrismaClient,
} from "@prisma/client";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { notifyKanbanTelegramSubscribers } from "@/lib/telegram-kanban-notify";
import { telegramHtmlLink } from "@/lib/telegram-html";
import { NextResponse } from "next/server";
import {
  getClientsPrisma,
  getOrdersPrisma,
  getPricingPrisma,
} from "@/lib/get-domain-prisma";
import { ensureDoctorClinicLink } from "@/lib/ensure-doctor-clinic-link";
import { buildConstructionCreatesFromInput } from "@/lib/order-construction-input";
import { isLabWorkStatus } from "@/lib/lab-work-status";
import { parseUrgentSelection } from "@/lib/order-urgency";
import { isOrderStatus } from "@/lib/order-status-labels";
import { ensureDefaultWarehouse } from "@/lib/inventory/ensure-default-warehouse";
import {
  normalizeProstheticsInput,
  prostheticsFromDb,
  prostheticsToJson,
} from "@/lib/order-prosthetics";
import { recordOrderRevision } from "@/lib/record-order-revision";
import { syncOrderProstheticsStockTx } from "@/lib/sync-order-prosthetics-stock";
import { isOrderCorrectionTrack } from "@/lib/order-correction-track";
import {
  pushKaitenCardTitleForOrderIfLinked,
  refreshOrderKaitenHeadMirrors,
} from "@/lib/kaiten-push-order-title";
import { normalizeInvoiceNumberFieldRu } from "@/lib/format-invoice-number-ru";
import { normalizeManualOrderNumber } from "@/lib/normalize-manual-order-number";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { normalizeInvoiceParsedLines } from "@/lib/invoice-parsed-types";
import { fetchOrderPriceListKindForOrder } from "@/lib/order-price-list-from-contractors";
import { resolveClinicIdForDoctorIpOrder } from "@/lib/resolve-order-doctor-ip-clinic";
import {
  canonicalOrderPayment,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PARTIAL,
  ORDER_PAYMENT_RECON_PAID,
  ORDER_PAYMENT_RECON_UNPAID,
  isReconciliationPaymentStatus,
} from "@/lib/order-clinic-client-fields";
import { parseOptionalDateTime } from "@/lib/parse-optional-date-time";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { savePatchedOrder } from "@/lib/order-patch-service";

function demoKanbanColumnLine(v: DemoKanbanColumn | null): string {
  if (v == null) return "не задана";
  if (v === "NEW") return "Новые";
  if (v === "IN_PROGRESS") return "В работе";
  if (v === "DONE") return "Готово";
  return String(v);
}

/** null / пусто — частная практика */
function parseClinicIdField(
  raw: unknown,
): "unchanged" | null | string {
  if (raw === undefined) return "unchanged";
  if (raw === null) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

const LEGACY_KAITEN_TYPE_NAME_BY_ID: Record<string, string> = {
  kt_vrem: "Временные",
  kt_mio: "МиоСплинт",
  kt_mod: "Модели",
  kt_nak: "Накладки",
  kt_nakmrt: "Накладки МРТ",
  kt_orto: "ОртоАппараты",
  kt_ortox: "ОртоАппараты x Хирургия",
  kt_post: "Постоянные",
  kt_spl: "Сплинт",
  kt_splmrt: "Сплинт МРТ",
  kt_hir: "Хирургия",
};

function legacyKaitenTypeName(id: string): string | null {
  const hit = LEGACY_KAITEN_TYPE_NAME_BY_ID[id];
  return typeof hit === "string" && hit.trim() ? hit.trim() : null;
}

function normalizeKaitenTypeName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().toLowerCase();
}

async function findTenantKaitenCardTypeIdByAny(
  prisma: Awaited<ReturnType<typeof getClientsPrisma>>,
  tenantId: string,
  rawId: string,
  rawName?: string | null,
): Promise<string | null> {
  const id = String(rawId || "").trim();
  if (!id) return null;
  let row = await prisma.kaitenCardType.findFirst({
    where: { tenantId, id },
    select: { id: true },
  });
  if (row) return row.id;
  const legacyName = legacyKaitenTypeName(id);
  if (legacyName) {
    row = await prisma.kaitenCardType.findFirst({
      where: { tenantId, name: legacyName },
      select: { id: true },
    });
    if (row) return row.id;
  }
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) return null;
  const needle = normalizeKaitenTypeName(name);
  if (!needle) return null;
  const candidates = await prisma.kaitenCardType.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
  });
  const hit = candidates.find((x) => normalizeKaitenTypeName(x.name) === needle);
  return hit?.id ?? null;
}

type PatchBody = {
  /** Ручная смена номера (уникальность в БД; при связи с Kaiten синхронизируется шапка карточки). */
  orderNumber?: string;
  clinicId?: string | null;
  doctorId?: string;
  patientName?: string | null;
  notes?: string | null;
  clientOrderText?: string | null;
  status?: string;
  labWorkStatus?: string;
  legalEntity?: string | null;
  payment?: string | null;
  paymentPartialRub?: number | null;
  excludeFromReconciliation?: boolean;
  /** ISO или null — сброс отложенного периода */
  excludeFromReconciliationUntil?: string | null;
  hasScans?: boolean;
  hasCt?: boolean;
  hasMri?: boolean;
  hasPhoto?: boolean;
  additionalSourceNotes?: string | null;
  urgentSelection?: string;
  dueDate?: string | null;
  dueToAdminsAt?: string | null;
  /** false — срок лабораторный без времени (Кайтен / шапка) */
  kaitenAdminDueHasTime?: boolean;
  /** false — запись «в течение дня» */
  dueToAdminsHasTime?: boolean;
  workReceivedAt?: string | null;
  invoiceIssued?: boolean;
  invoiceNumber?: string | null;
  invoicePaperDocs?: boolean;
  invoiceSentToEdo?: boolean;
  invoiceEdoSigned?: boolean;
  invoicePrinted?: boolean;
  narjadPrinted?: boolean;
  adminShippedOtpr?: boolean;
  /** Что отгружено (текст) */
  shippedDescription?: string | null;
  invoicePaymentNotes?: string | null;
  invoiceParsedSummaryText?: string | null;
  invoiceParsedLines?: unknown;
  invoiceParsedTotalRub?: number | null;
  orderPriceListNote?: string | null;
  /** Общая скидка на состав заказа, 0–100 */
  compositionDiscountPercent?: number;
  prostheticsOrdered?: boolean;
  correctionTrack?: string | null;
  correctionReason?: string | null;
  correctionPaid?: boolean;
  courierId?: string | null;
  courierPickupId?: string | null;
  courierDeliveryId?: string | null;
  constructions?: unknown;
  prosthetics?: unknown;
  /** Только демо-сессия: внутренний канбан */
  demoKanbanColumn?: string | null;
  /** Только демо-сессия: тип карточки (KaitenCardType в демо-БД) */
  kaitenCardTypeId?: string | null;
  /** Человекочитаемое имя типа (fallback при несовпадении id между канбаном и БД CRM). */
  kaitenCardTypeName?: string | null;
};

/** Поля шапки наряда, влияющие на заголовок/описание/срочность карточки Kaiten и зеркала канбана. */
const KAITEN_HEAD_PATCH_FIELDS: (keyof PatchBody)[] = [
  "orderNumber",
  "patientName",
  "notes",
  "clientOrderText",
  "dueDate",
  "kaitenAdminDueHasTime",
  "urgentSelection",
  "doctorId",
  "clinicId",
  "kaitenCardTypeId",
];

const orderInclude = {
  constructions: {
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

type HydrateConstructionLine = {
  constructionTypeId: string | null;
  materialId: string | null;
  priceListItemId: string | null;
};

type OrderForHydration = {
  doctorId: string;
  clinicId: string | null;
  courierId: string | null;
  courierPickupId: string | null;
  courierDeliveryId: string | null;
  constructions: HydrateConstructionLine[];
};

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((x): x is string => Boolean(x))));
}

async function hydrateOrderResponse<T extends OrderForHydration>(
  order: T,
  clientsPrisma: PrismaClient,
  pricingPrisma: PrismaClient,
) {
  const [doctor, clinic, courier, courierPickup, courierDelivery] = await Promise.all([
    clientsPrisma.doctor.findUnique({
      where: { id: order.doctorId },
      select: { id: true, fullName: true },
    }),
    order.clinicId
      ? clientsPrisma.clinic.findUnique({
          where: { id: order.clinicId },
          select: { id: true, name: true, address: true },
        })
      : Promise.resolve(null),
    order.courierId
      ? clientsPrisma.courier.findUnique({
          where: { id: order.courierId },
          select: { id: true, name: true, isActive: true },
        })
      : Promise.resolve(null),
    order.courierPickupId
      ? clientsPrisma.courier.findUnique({
          where: { id: order.courierPickupId },
          select: { id: true, name: true, isActive: true },
        })
      : Promise.resolve(null),
    order.courierDeliveryId
      ? clientsPrisma.courier.findUnique({
          where: { id: order.courierDeliveryId },
          select: { id: true, name: true, isActive: true },
        })
      : Promise.resolve(null),
  ]);
  const typeIds = uniqueIds(order.constructions.map((x) => x.constructionTypeId));
  const materialIds = uniqueIds(order.constructions.map((x) => x.materialId));
  const priceListItemIds = uniqueIds(
    order.constructions.map((x) => x.priceListItemId),
  );
  const [types, materials, priceItems] = await Promise.all([
    typeIds.length
      ? pricingPrisma.constructionType.findMany({
          where: { id: { in: typeIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    materialIds.length
      ? pricingPrisma.material.findMany({
          where: { id: { in: materialIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    priceListItemIds.length
      ? pricingPrisma.priceListItem.findMany({
          where: { id: { in: priceListItemIds } },
          select: {
            id: true,
            code: true,
            name: true,
            priceRub: true,
            leadWorkingDays: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const typeById = new Map(types.map((x) => [x.id, x]));
  const materialById = new Map(materials.map((x) => [x.id, x]));
  const priceItemById = new Map(priceItems.map((x) => [x.id, x]));
  return {
    ...order,
    doctor: doctor ?? { id: order.doctorId, fullName: "—" },
    clinic: clinic,
    courier: courier,
    courierPickup: courierPickup,
    courierDelivery: courierDelivery,
    constructions: order.constructions.map((line) => ({
      ...line,
      constructionType: line.constructionTypeId
        ? (typeById.get(line.constructionTypeId) ?? null)
        : null,
      material: line.materialId ? (materialById.get(line.materialId) ?? null) : null,
      priceListItem: line.priceListItemId
        ? (priceItemById.get(line.priceListItemId) ?? null)
        : null,
    })),
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
    getPricingPrisma(),
  ]);
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  try {
    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const order = await ordersPrisma.order.findFirst({
      where: { id: id.trim(), tenantId },
      include: {
        ...orderInclude,
        attachments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            uploadedToKaitenAt: true,
          },
        },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
    }
    return NextResponse.json(
      await hydrateOrderResponse(order, clientsPrisma, pricingPrisma),
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить наряд" },
      { status: 500 },
    );
  }
}

async function assertDoctorClinicAllowed(
  prisma: PrismaClient,
  doctorId: string,
  clinicId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true, deletedAt: true },
  });
  if (!doctor) {
    return { ok: false, error: "Врач не найден" };
  }
  if (doctor.deletedAt) {
    return {
      ok: false,
      error:
        "Врач удалён из конфигурации. Восстановите его в «Клиенты → История и удалённые».",
    };
  }
  if (clinicId === null) {
    return { ok: true };
  }
  const linked = await ensureDoctorClinicLink(prisma, doctorId, clinicId);
  if (!linked.ok) {
    return { ok: false, error: linked.error };
  }
  return { ok: true };
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
    getPricingPrisma(),
  ]);
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  if (raw !== null && typeof raw === "object" && "registeredByLabel" in raw) {
    return NextResponse.json(
      {
        error:
          "Поле «Оформил» нельзя менять при сохранении наряда — оно задаётся при созданении",
      },
      { status: 400 },
    );
  }
  const body = raw as PatchBody;

  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const demoFieldsRequested =
    body.demoKanbanColumn !== undefined || body.kaitenCardTypeId !== undefined;
  if (demoFieldsRequested && !session?.demo) {
    return NextResponse.json(
      { error: "Поле доступно только в демо-режиме" },
      { status: 403 },
    );
  }

  const orderId = id.trim();

  const existing = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: {
      id: true,
      tenantId: true,
      clinicId: true,
      doctorId: true,
      legalEntity: true,
      payment: true,
      paymentPartialRub: true,
      orderNumber: true,
      createdAt: true,
      archivedAt: true,
      prosthetics: true,
      correctionTrack: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  if (existing.archivedAt != null) {
    return NextResponse.json(
      {
        error:
          "Наряд в архиве. Откройте раздел «Архив» и нажмите «Восстановить».",
      },
      { status: 409 },
    );
  }

  const scalarData: Prisma.OrderUncheckedUpdateInput = {};

  if (body.orderNumber !== undefined) {
    const norm = normalizeManualOrderNumber(body.orderNumber);
    if (!norm.ok) {
      return NextResponse.json({ error: norm.error }, { status: 400 });
    }
    if (norm.value !== existing.orderNumber) {
      const clash = await ordersPrisma.order.findFirst({
        where: {
          orderNumber: norm.value,
          archivedAt: null,
          NOT: { id: orderId },
        },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: "Этот номер уже занят другим нарядом" },
          { status: 400 },
        );
      }
      scalarData.orderNumber = norm.value;
    }
  }

  if (body.patientName !== undefined) {
    const t = body.patientName === null ? "" : String(body.patientName).trim();
    scalarData.patientName = t || null;
  }

  if (body.notes !== undefined) {
    const t = body.notes === null ? "" : String(body.notes).trim();
    scalarData.notes = t || null;
  }

  if (body.clientOrderText !== undefined) {
    const t =
      body.clientOrderText === null
        ? ""
        : String(body.clientOrderText).trim();
    scalarData.clientOrderText = t || null;
  }

  if (body.legalEntity !== undefined) {
    const t =
      body.legalEntity === null ? "" : String(body.legalEntity).trim();
    scalarData.legalEntity = t || null;
  }

  if (body.excludeFromReconciliation !== undefined) {
    scalarData.excludeFromReconciliation = Boolean(
      body.excludeFromReconciliation,
    );
    if (!body.excludeFromReconciliation) {
      scalarData.excludeFromReconciliationUntil = null;
    }
  }
  if (body.excludeFromReconciliationUntil !== undefined) {
    if (body.excludeFromReconciliationUntil === null) {
      scalarData.excludeFromReconciliationUntil = null;
    } else {
      const d = parseOptionalDateTime(body.excludeFromReconciliationUntil);
      scalarData.excludeFromReconciliationUntil = d;
    }
  }

  if (body.hasScans !== undefined) scalarData.hasScans = Boolean(body.hasScans);
  if (body.hasCt !== undefined) scalarData.hasCt = Boolean(body.hasCt);
  if (body.hasMri !== undefined) scalarData.hasMri = Boolean(body.hasMri);
  if (body.hasPhoto !== undefined) scalarData.hasPhoto = Boolean(body.hasPhoto);

  if (body.additionalSourceNotes !== undefined) {
    const t =
      body.additionalSourceNotes === null
        ? ""
        : String(body.additionalSourceNotes).trim();
    scalarData.additionalSourceNotes = t || null;
  }

  if (body.compositionDiscountPercent !== undefined) {
    const n = Number(body.compositionDiscountPercent);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json(
        { error: "Общая скидка: укажите значение от 0 до 100 %" },
        { status: 400 },
      );
    }
    scalarData.compositionDiscountPercent = Math.round(n * 100) / 100;
  }

  if (body.status !== undefined) {
    const raw = String(body.status);
    if (!isOrderStatus(raw)) {
      return NextResponse.json(
        { error: "Некорректный статус заказа" },
        { status: 400 },
      );
    }
    scalarData.status = raw as PrismaOrderStatus;
  }

  if (body.labWorkStatus !== undefined) {
    const raw = String(body.labWorkStatus);
    if (!isLabWorkStatus(raw)) {
      return NextResponse.json(
        { error: "Некорректный этап работы" },
        { status: 400 },
      );
    }
    scalarData.labWorkStatus = raw as PrismaLabWorkStatus;
  }

  if (body.urgentSelection !== undefined) {
    try {
      const u = parseUrgentSelection(String(body.urgentSelection));
      scalarData.isUrgent = u.isUrgent;
      scalarData.urgentCoefficient = u.urgentCoefficient;
    } catch {
      return NextResponse.json(
        { error: "Некорректная срочность" },
        { status: 400 },
      );
    }
  }

  if (body.dueDate !== undefined) {
    const parsed = parseOptionalDateTime(body.dueDate);
    if (parsed && parsed.getTime() < existing.createdAt.getTime()) {
      return NextResponse.json(
        {
          error:
            "Срок лабораторный не может быть раньше даты занесения наряда в CRM",
        },
        { status: 400 },
      );
    }
    scalarData.dueDate = parsed;
  }

  if (body.dueToAdminsAt !== undefined) {
    const parsed = parseOptionalDateTime(body.dueToAdminsAt);
    if (parsed && parsed.getTime() < existing.createdAt.getTime()) {
      return NextResponse.json(
        {
          error:
            "Дата приёма пациента не может быть раньше даты занесения наряда в CRM",
        },
        { status: 400 },
      );
    }
    scalarData.dueToAdminsAt = parsed;
    scalarData.appointmentDate = parsed;
  }

  if (body.kaitenAdminDueHasTime !== undefined) {
    scalarData.kaitenAdminDueHasTime = Boolean(body.kaitenAdminDueHasTime);
  }

  if (body.dueToAdminsHasTime !== undefined) {
    scalarData.dueToAdminsHasTime = Boolean(body.dueToAdminsHasTime);
  }

  if (body.workReceivedAt !== undefined) {
    const parsed = parseOptionalDateTime(body.workReceivedAt);
    if (parsed && parsed.getTime() < existing.createdAt.getTime()) {
      return NextResponse.json(
        {
          error:
            "Поступление не может быть раньше даты занесения наряда в CRM",
        },
        { status: 400 },
      );
    }
    scalarData.workReceivedAt = parsed;
  }

  /** appointmentDate обновляется вместе с dueToAdminsAt (дата приёма пациента). */

  if (body.invoiceIssued !== undefined) {
    scalarData.invoiceIssued = Boolean(body.invoiceIssued);
  }

  if (body.invoiceNumber !== undefined) {
    const t =
      body.invoiceNumber === null ? "" : String(body.invoiceNumber).trim();
    scalarData.invoiceNumber = normalizeInvoiceNumberFieldRu(t);
  }

  if (body.invoicePaperDocs !== undefined) {
    scalarData.invoicePaperDocs = Boolean(body.invoicePaperDocs);
  }
  if (body.invoiceSentToEdo !== undefined) {
    scalarData.invoiceSentToEdo = Boolean(body.invoiceSentToEdo);
  }
  if (body.invoiceEdoSigned !== undefined) {
    scalarData.invoiceEdoSigned = Boolean(body.invoiceEdoSigned);
  }
  if (body.invoicePrinted !== undefined) {
    scalarData.invoicePrinted = Boolean(body.invoicePrinted);
  }
  if (body.narjadPrinted !== undefined) {
    scalarData.narjadPrinted = Boolean(body.narjadPrinted);
  }
  if (body.adminShippedOtpr !== undefined) {
    scalarData.adminShippedOtpr = Boolean(body.adminShippedOtpr);
  }

  if (body.shippedDescription !== undefined) {
    const t =
      body.shippedDescription === null
        ? ""
        : String(body.shippedDescription).trim();
    scalarData.shippedDescription = t.length ? t : null;
  }

  if (body.invoicePaymentNotes !== undefined) {
    scalarData.invoicePaymentNotes =
      body.invoicePaymentNotes === null
        ? null
        : String(body.invoicePaymentNotes).trim() || null;
  }

  if (body.invoiceParsedSummaryText !== undefined) {
    scalarData.invoiceParsedSummaryText =
      body.invoiceParsedSummaryText === null
        ? null
        : String(body.invoiceParsedSummaryText).trim() || null;
  }

  if (body.invoiceParsedLines !== undefined) {
    if (body.invoiceParsedLines === null) {
      scalarData.invoiceParsedLines = Prisma.DbNull;
    } else {
      const norm = normalizeInvoiceParsedLines(body.invoiceParsedLines);
      scalarData.invoiceParsedLines =
        norm === null
          ? Prisma.DbNull
          : (norm as unknown as Prisma.InputJsonValue);
    }
  }

  if (body.invoiceParsedTotalRub !== undefined) {
    if (body.invoiceParsedTotalRub === null) {
      scalarData.invoiceParsedTotalRub = null;
    } else {
      const n = Number(body.invoiceParsedTotalRub);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 99_999_999) {
        return NextResponse.json(
          { error: "Некорректная сумма из счёта (целые рубли)" },
          { status: 400 },
        );
      }
      scalarData.invoiceParsedTotalRub = n;
    }
  }

  if (body.orderPriceListNote !== undefined) {
    scalarData.orderPriceListNote =
      body.orderPriceListNote === null
        ? null
        : String(body.orderPriceListNote).trim().slice(0, 500) || null;
  }

  if (body.prostheticsOrdered !== undefined) {
    scalarData.prostheticsOrdered = Boolean(body.prostheticsOrdered);
  }

  if (body.correctionTrack !== undefined) {
    if (body.correctionTrack === null || body.correctionTrack === "") {
      scalarData.correctionTrack = null;
    } else {
      const raw = String(body.correctionTrack).trim();
      if (!isOrderCorrectionTrack(raw)) {
        return NextResponse.json(
          { error: "Некорректное направление коррекции" },
          { status: 400 },
        );
      }
      scalarData.correctionTrack = raw as OrderCorrectionTrack;
    }
  }

  if (body.correctionReason !== undefined) {
    scalarData.correctionReason =
      body.correctionReason === null || body.correctionReason === ""
        ? null
        : String(body.correctionReason).trim().slice(0, 4000) || null;
  }
  if (body.correctionPaid !== undefined) {
    scalarData.correctionPaid = Boolean(body.correctionPaid);
  }
  {
    const nextTrack =
      body.correctionTrack !== undefined
        ? body.correctionTrack === null || body.correctionTrack === ""
          ? null
          : String(body.correctionTrack).trim()
        : existing.correctionTrack == null
          ? null
          : String(existing.correctionTrack);
    if (nextTrack == null || nextTrack === "") {
      scalarData.correctionTrack = null;
      scalarData.correctionReason = null;
      scalarData.correctionPaid = false;
      scalarData.reworkAtCustomerExpense = false;
    }
  }

  if (body.courierPickupId !== undefined) {
    if (body.courierPickupId === null || body.courierPickupId === "") {
      scalarData.courierPickupId = null;
      scalarData.courierId = null;
    } else {
      const cid = String(body.courierPickupId).trim();
      const exists = await clientsPrisma.courier.findFirst({
        where: { id: cid },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "Курьер (привоз) не найден" },
          { status: 400 },
        );
      }
      scalarData.courierPickupId = cid;
      scalarData.courierId = cid;
    }
  }

  if (body.courierDeliveryId !== undefined) {
    if (body.courierDeliveryId === null || body.courierDeliveryId === "") {
      scalarData.courierDeliveryId = null;
    } else {
      const cid = String(body.courierDeliveryId).trim();
      const exists = await clientsPrisma.courier.findFirst({
        where: { id: cid },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "Курьер (отвоз) не найден" },
          { status: 400 },
        );
      }
      scalarData.courierDeliveryId = cid;
    }
  }

  if (body.courierId !== undefined && body.courierPickupId === undefined) {
    if (body.courierId === null || body.courierId === "") {
      scalarData.courierId = null;
    } else {
      const cid = String(body.courierId).trim();
      const exists = await clientsPrisma.courier.findFirst({
        where: { id: cid },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "Курьер не найден" },
          { status: 400 },
        );
      }
      scalarData.courierId = cid;
    }
  }

  if (body.prosthetics !== undefined) {
    const norm = normalizeProstheticsInput(body.prosthetics);
    scalarData.prosthetics = prostheticsToJson(norm) as Prisma.InputJsonValue;
  }

  const clinicField = parseClinicIdField(body.clinicId);
  const nextDoctorId =
    body.doctorId !== undefined
      ? String(body.doctorId).trim()
      : existing.doctorId;
  if (!nextDoctorId) {
    return NextResponse.json({ error: "Укажите врача" }, { status: 400 });
  }

  const requestedClinicId =
    clinicField === "unchanged" ? existing.clinicId : clinicField;
  const nextLegalForResolver =
    body.legalEntity !== undefined
      ? (() => {
          const t =
            body.legalEntity === null
              ? ""
              : String(body.legalEntity).trim();
          return t || null;
        })()
      : (existing.legalEntity?.trim() || null);

  const rClinic = await resolveClinicIdForDoctorIpOrder(clientsPrisma, {
    tenantId: existing.tenantId,
    doctorId: nextDoctorId,
    requestedClinicId,
    legalEntity: nextLegalForResolver,
  });
  if (!rClinic.ok) {
    return NextResponse.json({ error: rClinic.error }, { status: 400 });
  }
  const nextClinicId = rClinic.clinicId;
  const nextClinic = nextClinicId
    ? await clientsPrisma.clinic.findUnique({
        where: { id: nextClinicId },
        select: { worksWithReconciliation: true },
      })
    : null;
  const isReconciliationClinic = nextClinic?.worksWithReconciliation === true;

  let nextPayment: string | undefined;
  if (body.payment !== undefined) {
    const t = body.payment === null ? "" : String(body.payment).trim();
    nextPayment = t ? canonicalOrderPayment(t) : "";
  }
  if (isReconciliationClinic) {
    if (nextPayment === undefined) {
      const keepPaid = (existing.payment ?? "").trim() === ORDER_PAYMENT_RECON_PAID;
      nextPayment = keepPaid ? ORDER_PAYMENT_RECON_PAID : ORDER_PAYMENT_RECON_UNPAID;
    } else {
      nextPayment =
        nextPayment === ORDER_PAYMENT_RECON_PAID
          ? ORDER_PAYMENT_RECON_PAID
          : ORDER_PAYMENT_RECON_UNPAID;
    }
  } else if (nextPayment !== undefined) {
    if (nextPayment === "" || isReconciliationPaymentStatus(nextPayment)) {
      nextPayment = ORDER_PAYMENT_NOT_PAID;
    }
  }
  if (nextPayment !== undefined) {
    scalarData.payment = nextPayment || null;
  }

  const paymentForPartial =
    nextPayment !== undefined ? nextPayment : (existing.payment ?? "").trim();
  if (paymentForPartial === ORDER_PAYMENT_PARTIAL) {
    if (body.paymentPartialRub !== undefined) {
      if (body.paymentPartialRub === null) {
        return NextResponse.json(
          { error: "Для частичной оплаты укажите сумму (целые рубли)" },
          { status: 400 },
        );
      }
      const n = Number(body.paymentPartialRub);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 99_999_999) {
        return NextResponse.json(
          { error: "Для частичной оплаты укажите сумму (целые рубли)" },
          { status: 400 },
        );
      }
      scalarData.paymentPartialRub = n;
    }
  } else {
    scalarData.paymentPartialRub = null;
  }

  if (
    body.doctorId !== undefined ||
    clinicField !== "unchanged" ||
    body.legalEntity !== undefined
  ) {
    const check = await assertDoctorClinicAllowed(
      clientsPrisma,
      nextDoctorId,
      nextClinicId,
    );
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
  }

  if (body.doctorId !== undefined) {
    scalarData.doctorId = nextDoctorId;
  }

  if (nextClinicId !== existing.clinicId) {
    if (nextClinicId === null) {
      scalarData.clinicId = null;
    } else {
      scalarData.clinicId = nextClinicId;
    }
  }

  scalarData.orderPriceListKind = await fetchOrderPriceListKindForOrder(
    clientsPrisma,
    nextClinicId,
    nextDoctorId,
  );

  let constructionsUpdate: Prisma.OrderUpdateInput["constructions"] | undefined;
  if (body.constructions !== undefined) {
    const built = await buildConstructionCreatesFromInput(
      pricingPrisma,
      body.constructions,
      {
        clinicId: nextClinicId,
        doctorId: nextDoctorId,
      },
    );
    if (!built.ok) {
      return NextResponse.json(
        { error: built.err.error },
        { status: built.err.status },
      );
    }
    constructionsUpdate = {
      deleteMany: {},
      create: built.creates,
    };
  }

  if (body.demoKanbanColumn !== undefined) {
    if (body.demoKanbanColumn === null || body.demoKanbanColumn === "") {
      scalarData.demoKanbanColumn = null;
    } else {
      const d = String(body.demoKanbanColumn).trim();
      if (
        d !== "NEW" &&
        d !== "IN_PROGRESS" &&
        d !== "DONE"
      ) {
        return NextResponse.json(
          { error: "Некорректная колонка канбана" },
          { status: 400 },
        );
      }
      scalarData.demoKanbanColumn = d as DemoKanbanColumn;
    }
  }
  if (body.kaitenCardTypeId !== undefined) {
    if (body.kaitenCardTypeId === null || body.kaitenCardTypeId === "") {
      scalarData.kaitenCardTypeId = null;
    } else {
      const kid = String(body.kaitenCardTypeId).trim();
      const resolvedId = await findTenantKaitenCardTypeIdByAny(
        clientsPrisma,
        tenantId,
        kid,
        body.kaitenCardTypeName,
      );
      if (!resolvedId) {
        return NextResponse.json(
          { error: "Тип карточки не найден" },
          { status: 400 },
        );
      }
      scalarData.kaitenCardTypeId = resolvedId;
    }
  }

  const hasScalar = Object.keys(scalarData).length > 0;
  if (!hasScalar && constructionsUpdate === undefined) {
    return NextResponse.json(
      { error: "Нет полей для обновления" },
      { status: 400 },
    );
  }

  const prostheticsSync = body.prosthetics !== undefined;
  let warehouseId: string | null = null;
  if (prostheticsSync) {
    const wh = await ensureDefaultWarehouse();
    warehouseId = wh.id;
  }

  try {
    const order = await savePatchedOrder(ordersPrisma, {
      orderId,
      scalarData,
      constructionsUpdate,
      include: {
        ...orderInclude,
        attachments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            uploadedToKaitenAt: true,
          },
        },
      },
    });

    if (prostheticsSync && warehouseId) {
      const prevProsthetics = prostheticsFromDb(existing.prosthetics);
      const nextProsthetics = normalizeProstheticsInput(body.prosthetics);
      const syncRes = await pricingPrisma.$transaction((tx) =>
        syncOrderProstheticsStockTx(
          tx,
          orderId,
          warehouseId,
          prevProsthetics,
          nextProsthetics,
        ),
      );
      if (!syncRes.ok) {
        console.error("[PATCH order] stock sync", syncRes.error);
      }
    }

    try {
      await recordOrderRevision(orderId, { kind: "SAVE" });
    } catch (e) {
      console.error("[PATCH order] revision log", e);
    }

    const touchedCrmKanbanFields =
      body.demoKanbanColumn !== undefined || body.kaitenCardTypeId !== undefined;
    if (touchedCrmKanbanFields) {
      try {
        const base = crmPublicBaseUrl();
        const rel = kanbanOrderDeepLinkPath(orderId);
        const cardUrl = `${base}${rel}`;
        const linkLabel =
          order.kaitenCardTitleMirror?.trim() || `Наряд №${order.orderNumber}`;
        const linkHtml = telegramHtmlLink(cardUrl, linkLabel);
        const details: string[] = [];
        if (body.demoKanbanColumn !== undefined) {
          details.push(`колонка — ${demoKanbanColumnLine(order.demoKanbanColumn)}`);
        }
        if (body.kaitenCardTypeId !== undefined) {
          details.push(
            order.kaitenCardTypeId
              ? "тип карточки задан"
              : "тип карточки сброшен",
          );
        }
        const orderPageUrl = `${base}/orders/${encodeURIComponent(orderId)}`;
        const cardWord = telegramHtmlLink(cardUrl, "карточке");
        const orderWord = telegramHtmlLink(orderPageUrl, "заказе");
        const lines = [`В ${linkHtml} обновлено: ${details.join("; ")}`];
        const linesAdmin = [
          `В ${cardWord} и ${orderWord} обновлено: ${details.join("; ")}`,
        ];
        await notifyKanbanTelegramSubscribers(clientsPrisma, {
          event: "tg_kanban_crm_sync",
          actorUserId: session?.sub ?? null,
          lines,
          linesAdmin,
          parseMode: "HTML",
        });
      } catch (e) {
        console.error("[PATCH order] telegram kanban notify", e);
      }
    }

    let kaitenTitleSyncError: string | null = null;
    const touchedKaitenHead = KAITEN_HEAD_PATCH_FIELDS.some(
      (k) => body[k] !== undefined,
    );
    if (touchedKaitenHead) {
      try {
        if (session?.demo) {
          await refreshOrderKaitenHeadMirrors(orderId);
        } else {
          const push = await pushKaitenCardTitleForOrderIfLinked(orderId);
          if (!push.ok) {
            kaitenTitleSyncError = push.error;
            console.error("[PATCH order] Kaiten head sync", push.error);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        kaitenTitleSyncError = msg;
        console.error("[PATCH order] Kaiten head / mirrors sync", e);
      }
    }

    return NextResponse.json({
      ...(await hydrateOrderResponse(order, clientsPrisma, pricingPrisma)),
      kaitenTitleSyncError,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const meta = e.meta as { target?: string[] } | undefined;
      const t = meta?.target?.join(", ") ?? "";
      if (t.includes("orderNumber")) {
        return NextResponse.json(
          { error: "Этот номер уже занят другим нарядом" },
          { status: 400 },
        );
      }
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("Недостаточно") ||
      msg.includes("не найден") ||
      msg.includes("не найдена") ||
      msg.includes("Должно")
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось сохранить изменения" },
      { status: 500 },
    );
  }
}
