import { NextResponse } from "next/server";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { duplicatePreflightForNewOrder } from "@/lib/order-duplicate-preflight";
import { withApiTiming } from "@/lib/server/api-timing";
import { logger } from "@/lib/server/logger";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { resolveClinicIdForDoctorIpOrder } from "@/lib/resolve-order-doctor-ip-clinic";

/** GET ?doctorId=&patientName=&clinicId= (clinicId пусто — частная практика) &legalEntity= (опц., для ИП) */
export async function GET(req: Request) {
  return withApiTiming(
    { method: "GET", path: "/api/orders/duplicate-preflight" },
    async () => {
      try {
        const s0 = await getSessionFromCookies();
        if (!s0) {
          return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
        }
        const tenantId = await requireSessionTenantId(s0);
        const [clientsPrisma, ordersPrisma] = await Promise.all([
          getClientsPrisma(),
          getOrdersPrisma(),
        ]);
        const url = new URL(req.url);
        const doctorId = url.searchParams.get("doctorId")?.trim() ?? "";
        const patientName = url.searchParams.get("patientName")?.trim() ?? "";
        const clinicRaw = url.searchParams.get("clinicId");
        const clinicId =
          clinicRaw == null || clinicRaw.trim() === "" ? null : clinicRaw.trim();
        const legalRaw = url.searchParams.get("legalEntity");
        const legalEntity =
          legalRaw == null || legalRaw.trim() === "" ? null : legalRaw.trim();

        if (!doctorId) {
          return NextResponse.json(
            { error: "Укажите врача" },
            { status: 400 },
          );
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
        if (!doctor || doctor.deletedAt) {
          return NextResponse.json({ error: "Врач не найден" }, { status: 400 });
        }
        if (doctor.tenantId !== tenantId) {
          return NextResponse.json({ error: "Врач не найден" }, { status: 400 });
        }

        if (clinicId) {
          const clinic = await clientsPrisma.clinic.findFirst({
            where: { id: clinicId, deletedAt: null, tenantId },
            select: { id: true },
          });
          if (!clinic) {
            return NextResponse.json({ error: "Клиника не найдена" }, { status: 400 });
          }
        }

        const rClinic = await resolveClinicIdForDoctorIpOrder(clientsPrisma, {
          tenantId,
          doctorId,
          requestedClinicId: clinicId,
          legalEntity,
        });
        if (!rClinic.ok) {
          return NextResponse.json({ error: rClinic.error }, { status: 400 });
        }

        const result = await duplicatePreflightForNewOrder(ordersPrisma, {
          doctorId,
          clinicId: rClinic.clinicId,
          patientName,
        });
        return NextResponse.json(result);
      } catch (e) {
        logger.error(
          { err: e, msg: "duplicate_preflight_failed" },
          "GET /api/orders/duplicate-preflight",
        );
        return NextResponse.json(
          { error: "Не удалось проверить дубликаты" },
          { status: 500 },
        );
      }
    },
  );
}
