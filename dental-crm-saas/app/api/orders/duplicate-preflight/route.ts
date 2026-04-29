import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { duplicatePreflightForNewOrder } from "@/lib/order-duplicate-preflight";
import { withApiTiming } from "@/lib/server/api-timing";
import { logger } from "@/lib/server/logger";

/** GET ?doctorId=&patientName=&clinicId= (clinicId пусто — частная практика) */
export async function GET(req: Request) {
  return withApiTiming(
    { method: "GET", path: "/api/orders/duplicate-preflight" },
    async () => {
      try {
        const prisma = await getPrisma();
        const url = new URL(req.url);
        const doctorId = url.searchParams.get("doctorId")?.trim() ?? "";
        const patientName = url.searchParams.get("patientName")?.trim() ?? "";
        const clinicRaw = url.searchParams.get("clinicId");
        const clinicId =
          clinicRaw == null || clinicRaw.trim() === "" ? null : clinicRaw.trim();

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

        const doctor = await (await getPrisma()).doctor.findUnique({
          where: { id: doctorId },
          select: { id: true, deletedAt: true },
        });
        if (!doctor || doctor.deletedAt) {
          return NextResponse.json({ error: "Врач не найден" }, { status: 400 });
        }

        if (clinicId) {
          const clinic = await prisma.clinic.findFirst({
            where: { id: clinicId, deletedAt: null },
            select: { id: true },
          });
          if (!clinic) {
            return NextResponse.json({ error: "Клиника не найдена" }, { status: 400 });
          }
        }

        const result = await duplicatePreflightForNewOrder(prisma, {
          doctorId,
          clinicId,
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
