import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { patientSurnamesMatch } from "@/lib/order-continuation-match";
import { withApiTiming } from "@/lib/server/api-timing";
import { logger } from "@/lib/server/logger";

const LIMIT = 30;

/** GET ?doctorId=&patientName=&clinicId=&excludeOrderId=&q= */
export async function GET(req: Request) {
  return withApiTiming(
    { method: "GET", path: "/api/orders/continuation-search" },
    async () => {
      try {
        const session = await getSessionFromCookies();
        if (!session) {
          return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
        }
        const tenantId = await requireSessionTenantId(session);
        const [clientsPrisma, ordersPrisma] = await Promise.all([
          getClientsPrisma(),
          getOrdersPrisma(),
        ]);

        const url = new URL(req.url);
        const doctorId = url.searchParams.get("doctorId")?.trim() ?? "";
        const patientName = url.searchParams.get("patientName")?.trim() ?? "";
        const clinicRaw = url.searchParams.get("clinicId");
        const clinicId =
          clinicRaw == null || clinicRaw.trim() === ""
            ? null
            : clinicRaw.trim();
        const excludeOrderId =
          url.searchParams.get("excludeOrderId")?.trim() || null;
        const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

        if (!doctorId) {
          return NextResponse.json({ error: "Укажите врача" }, { status: 400 });
        }
        if (!patientName) {
          return NextResponse.json(
            { error: "Укажите пациента" },
            { status: 400 },
          );
        }

        const doctor = await clientsPrisma.doctor.findUnique({
          where: { id: doctorId },
          select: { id: true, deletedAt: true, tenantId: true },
        });
        if (!doctor || doctor.deletedAt || doctor.tenantId !== tenantId) {
          return NextResponse.json({ error: "Врач не найден" }, { status: 400 });
        }

        const rows = await ordersPrisma.order.findMany({
          where: {
            tenantId,
            archivedAt: null,
            status: { not: OrderStatus.CANCELLED },
            doctorId,
            ...(excludeOrderId ? { NOT: { id: excludeOrderId } } : {}),
          },
          select: {
            id: true,
            orderNumber: true,
            patientName: true,
            clinicId: true,
            adminShippedOtpr: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });

        let matched = rows.filter((r) =>
          patientSurnamesMatch(patientName, r.patientName),
        );

        if (q) {
          matched = matched.filter((r) => {
            const num = r.orderNumber.toLowerCase();
            const pat = (r.patientName ?? "").toLowerCase();
            return num.includes(q) || pat.includes(q);
          });
        }

        matched.sort((a, b) => {
          const aClinic = clinicId != null && a.clinicId === clinicId ? 1 : 0;
          const bClinic = clinicId != null && b.clinicId === clinicId ? 1 : 0;
          if (bClinic !== aClinic) return bClinic - aClinic;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

        const slice = matched.slice(0, LIMIT);
        const clinicIds = Array.from(
          new Set(slice.map((r) => r.clinicId).filter(Boolean)),
        ) as string[];
        const clinics =
          clinicIds.length > 0
            ? await clientsPrisma.clinic.findMany({
                where: { id: { in: clinicIds } },
                select: { id: true, name: true },
              })
            : [];
        const clinicNameById = new Map(clinics.map((c) => [c.id, c.name]));

        return NextResponse.json({
          orders: slice.map((r) => ({
            id: r.id,
            orderNumber: r.orderNumber,
            patientName: r.patientName,
            clinicName: r.clinicId
              ? (clinicNameById.get(r.clinicId) ?? null)
              : null,
            adminShippedOtpr: r.adminShippedOtpr,
          })),
        });
      } catch (e) {
        logger.error(
          { err: e, msg: "continuation_search_failed" },
          "GET /api/orders/continuation-search",
        );
        return NextResponse.json(
          { error: "Не удалось выполнить поиск" },
          { status: 500 },
        );
      }
    },
  );
}
