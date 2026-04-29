import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { buildClinicReconciliationXlsxBuffer } from "@/lib/clinic-reconciliation-xlsx";
import { legalEntityLabelFromClinic } from "@/lib/clinic-legal-label";
import { parseDateRangeUTC } from "@/lib/clinic-finance";
import { getPrisma } from "@/lib/get-prisma";
import { reconciliationCronTasksForNow } from "@/lib/reconciliation-schedule-msk";

/**
 * Планировщик: раз в сутки около 17:05 UTC (= 20:05 МСК, Россия без DST).
 * Authorization: Bearer $CRON_SECRET
 *
 * Для Vercel добавьте в vercel.json crons на этот путь и задайте CRON_SECRET в env.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.trim();
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const prisma = await getPrisma();
  const now = new Date();
  const clinics = await prisma.clinic.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      worksWithReconciliation: true,
      reconciliationFrequency: { not: null },
    },
    select: {
      id: true,
      name: true,
      reconciliationFrequency: true,
      billingLegalForm: true,
      legalFullName: true,
    },
  });

  let created = 0;
  const errors: string[] = [];

  for (const c of clinics) {
    const freq = c.reconciliationFrequency;
    if (!freq) continue;
    const tasks = reconciliationCronTasksForNow(now, freq);
    for (const t of tasks) {
      try {
        const range = parseDateRangeUTC(t.periodFromStr, t.periodToStr);
        if (!range) {
          errors.push(`${c.id}: некорректный период`);
          continue;
        }
        const dup = await prisma.clinicReconciliationSnapshot.findFirst({
          where: {
            clinicId: c.id,
            slot: t.slot,
            periodFromStr: t.periodFromStr,
            periodToStr: t.periodToStr,
          },
          select: { id: true },
        });
        if (dup) {
          continue;
        }
        const { buffer } = await buildClinicReconciliationXlsxBuffer(
          c.id,
          c.name,
          range,
        );
        await prisma.clinicReconciliationSnapshot.create({
          data: {
            clinicId: c.id,
            slot: t.slot,
            periodFromStr: t.periodFromStr,
            periodToStr: t.periodToStr,
            periodLabelRu: t.periodLabelRu,
            legalEntityLabel: legalEntityLabelFromClinic(c),
            xlsxBytes: new Uint8Array(buffer),
          },
        });
        created += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${c.name}: ${msg}`);
      }
    }
  }

  try {
    revalidateTag("attention-reminders");
  } catch {
    /* вне контекста Next — игнорируем */
  }

  return NextResponse.json({
    ok: true,
    created,
    clinicCount: clinics.length,
    errors,
  });
}
