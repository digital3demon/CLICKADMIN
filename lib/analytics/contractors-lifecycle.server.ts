import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import { analyticsBusinessDayKey } from "@/lib/analytics/range";
import {
  findReturnInPeriod,
  idleDaysSince,
  isDisappeared,
  isNewInPeriod,
  lastOrderAt,
  type ContractorsLifecycleReport,
  type DisappearedContractorRow,
  type NewContractorRow,
  type ReturnedContractorRow,
} from "@/lib/analytics/clients-lifecycle";

const PRIVATE_LABEL = "Частное лицо";

function clinicNamesForDoctor(
  links: Array<{ clinic: { name: string; deletedAt: Date | null } }>,
  fallback: string | null,
  acceptsPrivate: boolean,
): string[] {
  const names = [
    ...new Set(
      links
        .filter((l) => !l.clinic.deletedAt)
        .map((l) => l.clinic.name.trim())
        .filter(Boolean),
    ),
  ];
  if (names.length > 0) return names;
  if (fallback) return [fallback];
  if (acceptsPrivate) return [PRIVATE_LABEL];
  return [];
}

function byDateDesc<T extends { sortOn: string; name: string }>(a: T, b: T): number {
  const d = b.sortOn.localeCompare(a.sortOn);
  if (d !== 0) return d;
  return a.name.localeCompare(b.name, "ru");
}

/**
 * Новые / вернувшиеся / пропавшие клиники и врачи за окно [from, to] (MSK).
 * Заказы: не архив, не отмена; дата работы — createdAt.
 * «Пропали» считаются на min(to, сейчас).
 */
export async function loadContractorsLifecycle(
  from: Date,
  to: Date,
): Promise<ContractorsLifecycleReport> {
  const prisma = await getPrisma();
  const asOf = new Date(Math.min(to.getTime(), Date.now()));

  const [doctors, clinics, orders] = await Promise.all([
    prisma.doctor.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        fullName: true,
        createdAt: true,
        analyticsTreatAsExisting: true,
        acceptsPrivatePractice: true,
        clinicLinks: {
          select: {
            clinic: { select: { name: true, deletedAt: true } },
          },
        },
      },
    }),
    prisma.clinic.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        createdAt: true,
        analyticsTreatAsExisting: true,
      },
    }),
    prisma.order.findMany({
      where: { archivedAt: null, status: { not: "CANCELLED" } },
      select: {
        doctorId: true,
        clinicId: true,
        createdAt: true,
        clinic: { select: { name: true } },
      },
    }),
  ]);

  const doctorAts = new Map<string, Date[]>();
  const clinicAts = new Map<string, Date[]>();
  const lastClinicByDoctor = new Map<string, { at: number; name: string }>();

  for (const o of orders) {
    const da = doctorAts.get(o.doctorId);
    if (da) da.push(o.createdAt);
    else doctorAts.set(o.doctorId, [o.createdAt]);

    if (o.clinicId) {
      const ca = clinicAts.get(o.clinicId);
      if (ca) ca.push(o.createdAt);
      else clinicAts.set(o.clinicId, [o.createdAt]);
    }

    const cname = o.clinic?.name?.trim();
    if (cname) {
      const prev = lastClinicByDoctor.get(o.doctorId);
      const t = o.createdAt.getTime();
      if (!prev || t >= prev.at) {
        lastClinicByDoctor.set(o.doctorId, { at: t, name: cname });
      }
    }
  }

  const newDoctors: NewContractorRow[] = [];
  const returnedDoctors: ReturnedContractorRow[] = [];
  const disappearedDoctors: DisappearedContractorRow[] = [];

  for (const d of doctors) {
    const names = clinicNamesForDoctor(
      d.clinicLinks,
      lastClinicByDoctor.get(d.id)?.name ?? null,
      d.acceptsPrivatePractice,
    );
    if (
      isNewInPeriod({
        createdAt: d.createdAt,
        from,
        to,
        treatAsExisting: d.analyticsTreatAsExisting,
        deletedAt: null,
      })
    ) {
      newDoctors.push({
        id: d.id,
        name: d.fullName,
        clinicNames: names,
        inDbOn: analyticsBusinessDayKey(d.createdAt),
      });
    }

    const ats = doctorAts.get(d.id) ?? [];
    const ret = findReturnInPeriod(ats, from, to);
    if (ret) {
      returnedDoctors.push({
        id: d.id,
        name: d.fullName,
        clinicNames: names,
        returnedOn: analyticsBusinessDayKey(ret.returnedAt),
        previousOn: analyticsBusinessDayKey(ret.previousAt),
        gapDays: ret.gapDays,
      });
    }

    const last = lastOrderAt(ats);
    if (isDisappeared({ lastOrderAt: last, asOf })) {
      disappearedDoctors.push({
        id: d.id,
        name: d.fullName,
        clinicNames: names,
        lastOrderOn: analyticsBusinessDayKey(last!),
        idleDays: idleDaysSince(last!, asOf),
      });
    }
  }

  const newClinics: NewContractorRow[] = [];
  const returnedClinics: ReturnedContractorRow[] = [];
  const disappearedClinics: DisappearedContractorRow[] = [];

  for (const c of clinics) {
    if (
      isNewInPeriod({
        createdAt: c.createdAt,
        from,
        to,
        treatAsExisting: c.analyticsTreatAsExisting,
        deletedAt: null,
      })
    ) {
      newClinics.push({
        id: c.id,
        name: c.name,
        clinicNames: [],
        inDbOn: analyticsBusinessDayKey(c.createdAt),
      });
    }

    const ats = clinicAts.get(c.id) ?? [];
    const ret = findReturnInPeriod(ats, from, to);
    if (ret) {
      returnedClinics.push({
        id: c.id,
        name: c.name,
        clinicNames: [],
        returnedOn: analyticsBusinessDayKey(ret.returnedAt),
        previousOn: analyticsBusinessDayKey(ret.previousAt),
        gapDays: ret.gapDays,
      });
    }

    const last = lastOrderAt(ats);
    if (isDisappeared({ lastOrderAt: last, asOf })) {
      disappearedClinics.push({
        id: c.id,
        name: c.name,
        clinicNames: [],
        lastOrderOn: analyticsBusinessDayKey(last!),
        idleDays: idleDaysSince(last!, asOf),
      });
    }
  }

  return {
    newDoctors: newDoctors
      .map((r) => ({ ...r, sortOn: r.inDbOn }))
      .sort(byDateDesc)
      .map(({ sortOn: _s, ...r }) => r),
    newClinics: newClinics
      .map((r) => ({ ...r, sortOn: r.inDbOn }))
      .sort(byDateDesc)
      .map(({ sortOn: _s, ...r }) => r),
    returnedDoctors: returnedDoctors
      .map((r) => ({ ...r, sortOn: r.returnedOn }))
      .sort(byDateDesc)
      .map(({ sortOn: _s, ...r }) => r),
    returnedClinics: returnedClinics
      .map((r) => ({ ...r, sortOn: r.returnedOn }))
      .sort(byDateDesc)
      .map(({ sortOn: _s, ...r }) => r),
    disappearedDoctors: disappearedDoctors
      .sort((a, b) => b.idleDays - a.idleDays || a.name.localeCompare(b.name, "ru")),
    disappearedClinics: disappearedClinics
      .sort((a, b) => b.idleDays - a.idleDays || a.name.localeCompare(b.name, "ru")),
  };
}
