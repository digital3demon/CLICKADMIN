import { getSessionFromCookies } from "@/lib/auth/session-server";
import { cleanLegalFullName } from "@/lib/document-workflow-markers";
import {
  formatConstructionDescription,
  lineNetAfterLineDiscountRub,
} from "@/lib/format-order-construction";
import {
  getClientsPrisma,
  getOrdersPrisma,
  getPricingPrisma,
} from "@/lib/get-domain-prisma";
import {
  formatDocumentCopyOrderLine,
  type DocumentCopyPayload,
} from "@/lib/order-document-copy";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const orderId = id?.trim();
  if (!orderId) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
    getPricingPrisma(),
  ]);

  const order = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: {
      orderNumber: true,
      patientName: true,
      legalEntity: true,
      clinicId: true,
      doctorId: true,
      constructions: {
        orderBy: { sortOrder: "asc" },
        select: {
          category: true,
          quantity: true,
          unitPrice: true,
          lineDiscountPercent: true,
          constructionTypeId: true,
          priceListItemId: true,
          materialId: true,
          shade: true,
          teethFdi: true,
          bridgeFromFdi: true,
          bridgeToFdi: true,
          arch: true,
        },
      },
    },
  });
  if (!order) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const typeIds = [
    ...new Set(
      order.constructions
        .map((c) => c.constructionTypeId)
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  const materialIds = [
    ...new Set(
      order.constructions
        .map((c) => c.materialId)
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  const priceIds = [
    ...new Set(
      order.constructions
        .map((c) => c.priceListItemId)
        .filter((x): x is string => Boolean(x)),
    ),
  ];

  const [doctor, clinic, types, materials, priceItems] = await Promise.all([
    clientsPrisma.doctor.findUnique({
      where: { id: order.doctorId },
      select: {
        fullName: true,
        ipClinicAsSource: {
          select: {
            legalFullName: true,
            inn: true,
            deletedAt: true,
          },
        },
      },
    }),
    order.clinicId
      ? clientsPrisma.clinic.findUnique({
          where: { id: order.clinicId },
          select: { legalFullName: true, inn: true, deletedAt: true },
        })
      : Promise.resolve(null),
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
    priceIds.length
      ? pricingPrisma.priceListItem.findMany({
          where: { id: { in: priceIds } },
          select: { id: true, code: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const typeById = new Map(types.map((t) => [t.id, t]));
  const materialById = new Map(materials.map((m) => [m.id, m]));
  const priceById = new Map(priceItems.map((p) => [p.id, p]));

  const financeClinic =
    clinic && !clinic.deletedAt
      ? clinic
      : !order.clinicId &&
          order.legalEntity === "ИП" &&
          doctor?.ipClinicAsSource &&
          !doctor.ipClinicAsSource.deletedAt
        ? doctor.ipClinicAsSource
        : null;

  const legalName = cleanLegalFullName(financeClinic?.legalFullName);
  const inn = (financeClinic?.inn ?? "").trim() || null;

  const patientShort = personNameSurnameInitials(order.patientName);
  const doctorShort = personNameSurnameInitials(doctor?.fullName ?? null);

  const payload: DocumentCopyPayload = {
    orderLine: formatDocumentCopyOrderLine({
      orderNumber: order.orderNumber,
      patientName: order.patientName,
      doctorName: doctor?.fullName ?? null,
      patientShort,
      doctorShort,
    }),
    legalName,
    inn,
    composition: order.constructions.map((line) => {
      const title = formatConstructionDescription({
        category: line.category,
        constructionType: line.constructionTypeId
          ? (typeById.get(line.constructionTypeId) ?? null)
          : null,
        priceListItem: line.priceListItemId
          ? (priceById.get(line.priceListItemId) ?? null)
          : null,
        material: line.materialId
          ? (materialById.get(line.materialId) ?? null)
          : null,
        shade: line.shade,
        teethFdi: line.teethFdi,
        bridgeFromFdi: line.bridgeFromFdi,
        bridgeToFdi: line.bridgeToFdi,
        arch: line.arch,
      });
      return {
        title,
        quantity:
          Number.isFinite(line.quantity) && line.quantity > 0
            ? line.quantity
            : 1,
        amountRub: lineNetAfterLineDiscountRub(
          line.quantity,
          line.unitPrice,
          line.lineDiscountPercent,
        ),
      };
    }),
  };

  return Response.json(payload);
}
