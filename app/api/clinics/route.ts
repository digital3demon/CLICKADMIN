import { ContractorRevisionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { recordContractorRevision } from "@/lib/record-contractor-revision";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function clinicRowSelect() {
  return {
    id: true,
    name: true,
    address: true,
    isActive: true,
    doctorLinks: {
      orderBy: { doctor: { fullName: "asc" as const } },
      select: {
        doctor: { select: { id: true, fullName: true, orderPriceListKind: true } },
      },
    },
  } as const;
}

export async function POST(req: Request) {
  const prisma = await getPrisma();
  const s0 = await getSessionFromCookies();
  if (!s0) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(s0);
  try {
    const body = (await req.json()) as {
      name?: unknown;
      address?: unknown;
      doctorFullName?: unknown;
    };
    const clinicName = trimOrNull(body.name);
    const address = trimOrNull(body.address);
    const doctorFullName = trimOrNull(body.doctorFullName);

    /** С врачом: клиника необязательна; без врача — только создание клиники (как раньше). */
    if (doctorFullName) {
      if (!clinicName) {
        const doctor = await prisma.doctor.create({
          data: {
            tenantId,
            fullName: doctorFullName,
            acceptsPrivatePractice: true,
          },
          select: { id: true, fullName: true },
        });
        await recordContractorRevision(prisma, {
          kind: ContractorRevisionKind.CREATE,
          doctorId: doctor.id,
          summary: `Создан врач «${doctor.fullName}» (частная практика)`,
        });
        return NextResponse.json({ clinic: null, doctor });
      }

      const { clinic, doctor } = await prisma.$transaction(async (tx) => {
        const c = await tx.clinic.create({
          data: { tenantId, name: clinicName, address },
        });
        const d = await tx.doctor.create({
          data: {
            tenantId,
            fullName: doctorFullName,
            acceptsPrivatePractice: false,
          },
          select: { id: true, fullName: true },
        });
        await tx.doctorOnClinic.create({
          data: { doctorId: d.id, clinicId: c.id },
        });
        await recordContractorRevision(tx, {
          kind: ContractorRevisionKind.CREATE,
          clinicId: c.id,
          summary: `Созданы клиника «${clinicName}» и врач «${d.fullName}»`,
        });
        return { clinic: c, doctor: d };
      });

      const full = await prisma.clinic.findUnique({
        where: { id: clinic.id },
        select: clinicRowSelect(),
      });
      if (!full) {
        return NextResponse.json(
          { error: "Клиника создана, но не удалось прочитать запись" },
          { status: 500 },
        );
      }
      const row = {
        id: full.id,
        name: full.name,
        address: full.address,
        isActive: full.isActive,
        doctors: full.doctorLinks.map((l) => l.doctor),
      };
      return NextResponse.json({ clinic: row, doctor });
    }

    if (!clinicName) {
      return NextResponse.json(
        {
          error:
            "Укажите название клиники или заполните ФИО врача (быстрое добавление из наряда)",
        },
        { status: 400 },
      );
    }

    const clinic = await prisma.clinic.create({
      data: { tenantId, name: clinicName, address },
      select: clinicRowSelect(),
    });

    await recordContractorRevision(prisma, {
      kind: ContractorRevisionKind.CREATE,
      clinicId: clinic.id,
      summary: `Создана клиника «${clinicName}»`,
    });

    const row = {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      isActive: clinic.isActive,
      doctors: clinic.doctorLinks.map((l) => l.doctor),
    };

    return NextResponse.json({ clinic: row });
  } catch (e) {
    console.error("[POST /api/clinics]", e);
    return NextResponse.json(
      { error: "Не удалось создать клинику" },
      { status: 500 },
    );
  }
}

const clinicListSelect = {
  id: true,
  name: true,
  address: true,
  isActive: true,
  legalFullName: true,
  billingLegalForm: true,
  orderPriceListKind: true,
  worksWithReconciliation: true,
  reconciliationFrequency: true,
  sourceDoctorId: true,
  doctorLinks: {
    orderBy: { doctor: { fullName: "asc" as const } },
    select: {
      doctor: { select: { id: true, fullName: true } },
    },
  },
} as const;

export async function GET() {
  const prisma = await getPrisma();
  try {
    let rows: Array<{
      id: string;
      name: string;
      address: string | null;
      isActive: boolean;
      legalFullName: string | null;
      billingLegalForm: "IP" | "OOO" | null;
      orderPriceListKind: "MAIN" | "CUSTOM" | null;
      worksWithReconciliation: boolean;
      reconciliationFrequency: "MONTHLY_1" | "MONTHLY_2" | null;
      sourceDoctorId: string | null;
      doctorLinks: Array<{ doctor: { id: string; fullName: string } }>;
    }>;
    try {
      rows = await prisma.clinic.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: clinicListSelect,
      });
    } catch {
      // Фолбэк для старых БД без части колонок: отдать минимум для формы наряда.
      const minimal = await prisma.clinic.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          address: true,
          isActive: true,
          sourceDoctorId: true,
          doctorLinks: {
            orderBy: { doctor: { fullName: "asc" } },
            select: { doctor: { select: { id: true, fullName: true } } },
          },
        },
      });
      rows = minimal.map((c) => ({
        ...c,
        legalFullName: null,
        billingLegalForm: null,
        orderPriceListKind: null,
        worksWithReconciliation: false,
        reconciliationFrequency: null,
      }));
    }

    let privatePracticeDoctors: Array<{ id: string; fullName: string }> = [];
    let doctorRows: Array<{
      id: string;
      fullName: string;
      isIpEntrepreneur: boolean;
    }> = [];
    let ipClinics: Array<{ id: string; sourceDoctorId: string | null }> = [];

    try {
      [privatePracticeDoctors, doctorRows, ipClinics] = await Promise.all([
        prisma.doctor.findMany({
          where: { acceptsPrivatePractice: true, deletedAt: null },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        }),
        prisma.doctor.findMany({
          where: { deletedAt: null },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true, isIpEntrepreneur: true },
        }),
        prisma.clinic.findMany({
          where: { sourceDoctorId: { not: null }, deletedAt: null },
          select: { id: true, sourceDoctorId: true },
        }),
      ]);
    } catch {
      const doctorsMinimal = await prisma.doctor.findMany({
        where: { deletedAt: null },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      });
      privatePracticeDoctors = doctorsMinimal;
      doctorRows = doctorsMinimal.map((d) => ({
        ...d,
        isIpEntrepreneur: false,
      }));
      ipClinics = [];
    }

    const ipClinicIdByDoctorId = new Map(
      ipClinics
        .filter(
          (c) => c.sourceDoctorId != null,
        )
        .map((c) => [c.sourceDoctorId as string, c.id] as const),
    );

    const allDoctors = doctorRows.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      isIpEntrepreneur: d.isIpEntrepreneur,
      ipClinicId: ipClinicIdByDoctorId.get(d.id) ?? null,
    }));

    const clinics = rows.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      isActive: c.isActive,
      legalFullName: c.legalFullName,
      billingLegalForm: c.billingLegalForm,
      orderPriceListKind: c.orderPriceListKind,
      worksWithReconciliation: c.worksWithReconciliation,
      reconciliationFrequency: c.reconciliationFrequency,
      sourceDoctorId: c.sourceDoctorId,
      doctors: c.doctorLinks.map((l) => l.doctor),
    }));

    return NextResponse.json({
      clinics,
      privatePracticeDoctors,
      allDoctors,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить клиники" },
      { status: 500 },
    );
  }
}
