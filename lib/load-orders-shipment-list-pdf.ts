import "server-only";
import type { Prisma } from "@prisma/client";
import type { PrismaClient, UserRole } from "@prisma/client";
import { getClientsPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import { formatOrderCompositionBrief } from "@/lib/format-order-composition-brief";
import {
  compareOrdersByEffectiveAppointment,
  effectiveAppointmentDate,
  ordersShipmentListWhere,
} from "@/lib/orders-shipment-list-filter";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
import { ordersShipmentModeLabel } from "@/lib/orders-shipment-list-query";
import {
  formatMoscowDateDayMonth,
  formatMoscowDateTime,
  formatMoscowTime,
} from "@/lib/moscow-datetime-format";
import { orderShipmentListStatusLabel } from "@/lib/order-shipment-list-status-label";
import { orderTestVisibilityWhere } from "@/lib/order-test-visibility";

const MAX_SHIPMENT_PDF_ROWS = 5000;

const shipmentPdfSelect = {
  id: true,
  orderNumber: true,
  patientName: true,
  appointmentDate: true,
  dueToAdminsAt: true,
  labWorkStatus: true,
  kaitenColumnTitle: true,
  demoKanbanColumn: true,
  kaitenBlocked: true,
  clinicId: true,
  doctorId: true,
  constructions: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      quantity: true,
      category: true,
      constructionTypeId: true,
      priceListItemId: true,
    },
  },
} as const satisfies Prisma.OrderSelect;

type ShipmentPdfRaw = Prisma.OrderGetPayload<{
  select: typeof shipmentPdfSelect;
}>;

export type OrdersShipmentListPdfRow = {
  status: string;
  orderNumber: string;
  patientName: string;
  doctorName: string;
  clinicLine: string;
  compositionBrief: string;
  /** Дата записи: dd.mm (без года), крупнее в PDF. */
  appointmentDateLabel: string;
  /** Время записи отдельной строкой; пусто если даты нет. */
  appointmentTimeLabel: string;
};

export type OrdersShipmentListPdfPayload = {
  title: string;
  printedAtLabel: string;
  rows: OrdersShipmentListPdfRow[];
  truncated: boolean;
};

function formatClinicLine(
  clinic: { name: string; address: string | null } | null,
): string {
  if (!clinic) return "—";
  const addr = clinic.address?.trim();
  return addr ? `${clinic.name}, ${addr}` : clinic.name;
}

function formatAppointmentParts(order: {
  appointmentDate: Date | null;
  dueToAdminsAt: Date | null;
}): { appointmentDateLabel: string; appointmentTimeLabel: string } {
  const d = effectiveAppointmentDate(order);
  if (!d) {
    return { appointmentDateLabel: "—", appointmentTimeLabel: "" };
  }
  return {
    appointmentDateLabel: formatMoscowDateDayMonth(d),
    appointmentTimeLabel: formatMoscowTime(d),
  };
}

export async function loadOrdersShipmentListPdf(
  db: PrismaClient,
  opts: {
    tenantId: string;
    shipmentMode: OrdersShipmentMode;
    shipFrom: string | null;
    shipTo: string | null;
    viewerRole?: UserRole | null;
    viewerUserId?: string | null;
  },
): Promise<OrdersShipmentListPdfPayload> {
  const parts: Prisma.OrderWhereInput[] = [
    { tenantId: opts.tenantId },
    { archivedAt: null },
    orderTestVisibilityWhere({
      viewerRole: opts.viewerRole ?? null,
      viewerUserId: opts.viewerUserId ?? null,
    }),
    ordersShipmentListWhere({
      mode: opts.shipmentMode,
      shipFrom: opts.shipFrom,
      shipTo: opts.shipTo,
    }),
  ];

  const where: Prisma.OrderWhereInput = { AND: parts };

  const rawRows = await db.order.findMany({
    where,
    select: shipmentPdfSelect,
    take: MAX_SHIPMENT_PDF_ROWS,
    orderBy: [{ orderNumber: "asc" }],
  });

  const truncated = rawRows.length >= MAX_SHIPMENT_PDF_ROWS;
  const sorted = [...rawRows].sort(compareOrdersByEffectiveAppointment);

  const doctorIds = Array.from(new Set(sorted.map((r) => r.doctorId)));
  const clinicIds = Array.from(
    new Set(sorted.map((r) => r.clinicId).filter(Boolean)),
  ) as string[];
  const constructionTypeIds = Array.from(
    new Set(
      sorted.flatMap((r) =>
        r.constructions
          .map((c) => c.constructionTypeId)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  );
  const priceListItemIds = Array.from(
    new Set(
      sorted.flatMap((r) =>
        r.constructions
          .map((c) => c.priceListItemId)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  );

  const clientsPrisma = await getClientsPrisma();
  const pricingPrisma = await getPricingPrisma();
  const [doctors, clinics, constructionTypes, priceItems] = await Promise.all([
    doctorIds.length
      ? clientsPrisma.doctor.findMany({
          where: { id: { in: doctorIds } },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
    clinicIds.length
      ? clientsPrisma.clinic.findMany({
          where: { id: { in: clinicIds } },
          select: { id: true, name: true, address: true },
        })
      : Promise.resolve([]),
    constructionTypeIds.length
      ? pricingPrisma.constructionType.findMany({
          where: { id: { in: constructionTypeIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    priceListItemIds.length
      ? pricingPrisma.priceListItem.findMany({
          where: { id: { in: priceListItemIds } },
          select: { id: true, code: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const doctorById = new Map(doctors.map((d) => [d.id, d]));
  const clinicById = new Map(clinics.map((c) => [c.id, c]));
  const constructionTypeById = new Map(constructionTypes.map((c) => [c.id, c]));
  const priceItemById = new Map(priceItems.map((p) => [p.id, p]));

  const rows = sorted.map((o) => mapShipmentPdfRow(o, {
    doctorById,
    clinicById,
    constructionTypeById,
    priceItemById,
  }));

  const modeLabel = ordersShipmentModeLabel({
    mode: opts.shipmentMode,
    shipFrom: opts.shipFrom,
    shipTo: opts.shipTo,
    periodError: null,
  });

  return {
    title: `Отгрузки: ${modeLabel ?? opts.shipmentMode}`,
    printedAtLabel: formatMoscowDateTime(new Date()),
    rows,
    truncated,
  };
}

function mapShipmentPdfRow(
  o: ShipmentPdfRaw,
  maps: {
    doctorById: Map<string, { fullName: string }>;
    clinicById: Map<string, { name: string; address: string | null }>;
    constructionTypeById: Map<string, { name: string }>;
    priceItemById: Map<string, { code: string; name: string }>;
  },
): OrdersShipmentListPdfRow {
  const clinic = o.clinicId ? maps.clinicById.get(o.clinicId) ?? null : null;
  const doctor = maps.doctorById.get(o.doctorId);
  const hydratedConstructions = o.constructions.map((c) => ({
    quantity: c.quantity,
    category: c.category,
    constructionType: c.constructionTypeId
      ? (maps.constructionTypeById.get(c.constructionTypeId) ?? null)
      : null,
    priceListItem: c.priceListItemId
      ? (maps.priceItemById.get(c.priceListItemId) ?? null)
      : null,
  }));

  return {
    status: orderShipmentListStatusLabel(o),
    orderNumber: o.orderNumber,
    patientName: o.patientName?.trim() || "—",
    doctorName: doctor?.fullName?.trim() || "—",
    clinicLine: formatClinicLine(clinic),
    compositionBrief: formatOrderCompositionBrief(hydratedConstructions),
    ...formatAppointmentParts(o),
  };
}
