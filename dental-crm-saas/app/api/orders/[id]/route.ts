import {
  DemoKanbanColumn,
  Prisma,
  type LabWorkStatus as PrismaLabWorkStatus,
  type OrderCorrectionTrack,
  type OrderStatus as PrismaOrderStatus,
  type PrismaClient,
} from "@prisma/client";
import { notifyKanbanTelegramSubscribers } from "@/lib/telegram-kanban-notify";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
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

function parseOptionalDateTime(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

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
  prostheticsOrdered?: boolean;
  correctionTrack?: string | null;
  courierId?: string | null;
  courierPickupId?: string | null;
  courierDeliveryId?: string | null;
  constructions?: unknown;
  prosthetics?: unknown;
  /** Только демо-сессия: внутренний канбан */
  demoKanbanColumn?: string | null;
  /** Только демо-сессия: тип карточки (KaitenCardType в демо-БД) */
  kaitenCardTypeId?: string | null;
};

/** Поля шапки наряда, влияющие на заголовок/описание/срочность карточки Kaiten и зеркала канбана. */
const KAITEN_HEAD_PATCH_FIELDS: (keyof PatchBody)[] = [
  "orderNumber",
  "patientName",
  "notes",
  "clientOrderText",
  "dueDate",
  "urgentSelection",
  "doctorId",
  "clinicId",
  "kaitenCardTypeId",
];

const orderInclude = {
  clinic: { select: { id: true, name: true, address: true } },
  doctor: { select: { id: true, fullName: true } },
  courier: { select: { id: true, name: true, isActive: true } },
  courierPickup: { select: { id: true, name: true, isActive: true } },
  courierDelivery: { select: { id: true, name: true, isActive: true } },
  constructions: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      constructionType: { select: { name: true } },
      priceListItem: { select: { code: true, name: true, priceRub: true } },
      material: { select: { name: true } },
    },
  },
} as const;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const prisma = await getPrisma();
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: id.trim() },
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
    return NextResponse.json(order);
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
  const prisma = await getPrisma();
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
  const demoFieldsRequested =
    body.demoKanbanColumn !== undefined || body.kaitenCardTypeId !== undefined;
  if (demoFieldsRequested && !session?.demo) {
    return NextResponse.json(
      { error: "Поле доступно только в демо-режиме" },
      { status: 403 },
    );
  }

  const orderId = id.trim();

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      clinicId: true,
      doctorId: true,
      orderNumber: true,
      createdAt: true,
      archivedAt: true,
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

  const scalarData: Prisma.OrderUpdateInput = {};

  if (body.orderNumber !== undefined) {
    const norm = normalizeManualOrderNumber(body.orderNumber);
    if (!norm.ok) {
      return NextResponse.json({ error: norm.error }, { status: 400 });
    }
    if (norm.value !== existing.orderNumber) {
      const clash = await prisma.order.findFirst({
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

  if (body.payment !== undefined) {
    const t = body.payment === null ? "" : String(body.payment).trim();
    scalarData.payment = t || null;
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

  if (body.courierPickupId !== undefined) {
    if (body.courierPickupId === null || body.courierPickupId === "") {
      scalarData.courierPickup = { disconnect: true };
      scalarData.courier = { disconnect: true };
    } else {
      const cid = String(body.courierPickupId).trim();
      const exists = await prisma.courier.findFirst({
        where: { id: cid },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "Курьер (привоз) не найден" },
          { status: 400 },
        );
      }
      scalarData.courierPickup = { connect: { id: cid } };
      scalarData.courier = { connect: { id: cid } };
    }
  }

  if (body.courierDeliveryId !== undefined) {
    if (body.courierDeliveryId === null || body.courierDeliveryId === "") {
      scalarData.courierDelivery = { disconnect: true };
    } else {
      const cid = String(body.courierDeliveryId).trim();
      const exists = await prisma.courier.findFirst({
        where: { id: cid },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "Курьер (отвоз) не найден" },
          { status: 400 },
        );
      }
      scalarData.courierDelivery = { connect: { id: cid } };
    }
  }

  if (body.courierId !== undefined && body.courierPickupId === undefined) {
    if (body.courierId === null || body.courierId === "") {
      scalarData.courier = { disconnect: true };
    } else {
      const cid = String(body.courierId).trim();
      const exists = await prisma.courier.findFirst({
        where: { id: cid },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "Курьер не найден" },
          { status: 400 },
        );
      }
      scalarData.courier = { connect: { id: cid } };
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

  const nextClinicId =
    clinicField === "unchanged" ? existing.clinicId : clinicField;

  if (body.doctorId !== undefined || clinicField !== "unchanged") {
    const check = await assertDoctorClinicAllowed(
      prisma,
      nextDoctorId,
      nextClinicId,
    );
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
  }

  if (body.doctorId !== undefined) {
    scalarData.doctor = { connect: { id: nextDoctorId } };
  }

  if (clinicField !== "unchanged") {
    if (nextClinicId === null) {
      scalarData.clinic = { disconnect: true };
    } else {
      scalarData.clinic = { connect: { id: nextClinicId } };
    }
  }

  scalarData.orderPriceListKind = await fetchOrderPriceListKindForOrder(
    prisma,
    nextClinicId,
    nextDoctorId,
  );

  let constructionsUpdate: Prisma.OrderUpdateInput["constructions"] | undefined;
  if (body.constructions !== undefined) {
    const built = await buildConstructionCreatesFromInput(
      prisma,
      body.constructions,
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
      scalarData.kaitenCardType = { disconnect: true };
    } else {
      const kid = String(body.kaitenCardTypeId).trim();
      const kt = await prisma.kaitenCardType.findFirst({
        where: { id: kid },
        select: { id: true },
      });
      if (!kt) {
        return NextResponse.json(
          { error: "Тип карточки не найден" },
          { status: 400 },
        );
      }
      scalarData.kaitenCardType = { connect: { id: kid } };
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
    const order = await prisma.$transaction(async (tx) => {
      let prevProsthetics = null as ReturnType<typeof prostheticsFromDb> | null;
      if (prostheticsSync) {
        const prevRow = await tx.order.findUnique({
          where: { id: orderId },
          select: { prosthetics: true },
        });
        prevProsthetics = prostheticsFromDb(prevRow?.prosthetics);
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          ...scalarData,
          ...(constructionsUpdate
            ? { constructions: constructionsUpdate }
            : {}),
        },
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
        const nextProsthetics = normalizeProstheticsInput(body.prosthetics);
        const syncRes = await syncOrderProstheticsStockTx(
          tx,
          orderId,
          warehouseId,
          prevProsthetics,
          nextProsthetics,
        );
        if (!syncRes.ok) {
          throw new Error(syncRes.error);
        }
      }

      return updated;
    });

    try {
      await recordOrderRevision(orderId, { kind: "SAVE" });
    } catch (e) {
      console.error("[PATCH order] revision log", e);
    }

    const touchedCrmKanbanFields =
      body.demoKanbanColumn !== undefined || body.kaitenCardTypeId !== undefined;
    if (touchedCrmKanbanFields) {
      try {
        const lines: string[] = [
          "Канбан CRM",
          `Наряд №${order.orderNumber}`,
        ];
        if (body.demoKanbanColumn !== undefined) {
          lines.push(`Колонка: ${demoKanbanColumnLine(order.demoKanbanColumn)}`);
        }
        if (body.kaitenCardTypeId !== undefined) {
          lines.push(
            order.kaitenCardTypeId
              ? "Тип карточки: задан"
              : "Тип карточки: сброшен",
          );
        }
        await notifyKanbanTelegramSubscribers(prisma, {
          event: "tg_kanban_crm_sync",
          actorUserId: session?.sub ?? null,
          lines,
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

    return NextResponse.json({ ...order, kaitenTitleSyncError });
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
