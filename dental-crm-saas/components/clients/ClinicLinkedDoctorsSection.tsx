"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ClinicDoctorLinkPanel } from "@/components/clients/ClinicDoctorLinkPanel";
import { DoctorClinicUnlinkButton } from "@/components/clients/DoctorClinicUnlinkButton";
import { emitClinicDoctorLinkDelta } from "@/lib/client-link-sync-events";

export type ClinicDoctorLinkInitial = {
  doctorId: string;
  doctor: {
    id: string;
    fullName: string;
    deletedAt: Date | string | null;
  };
};

function isDeleted(
  deletedAt: ClinicDoctorLinkInitial["doctor"]["deletedAt"],
): boolean {
  return deletedAt != null;
}

export function ClinicLinkedDoctorsSection({
  clinicId,
  initialLinks,
}: {
  clinicId: string;
  initialLinks: ClinicDoctorLinkInitial[];
}) {
  const [links, setLinks] = useState<ClinicDoctorLinkInitial[]>(initialLinks);

  const activeLinks = useMemo(
    () => links.filter((l) => !isDeleted(l.doctor.deletedAt)),
    [links],
  );

  const onDoctorLinked = useCallback(
    (doctor: { id: string; fullName: string }) => {
      setLinks((prev) => {
        if (prev.some((x) => x.doctorId === doctor.id)) return prev;
        return [
          ...prev,
          {
            doctorId: doctor.id,
            doctor: {
              id: doctor.id,
              fullName: doctor.fullName,
              deletedAt: null,
            },
          },
        ];
      });
      emitClinicDoctorLinkDelta(clinicId, 1);
    },
    [clinicId],
  );

  const onDoctorUnlinked = useCallback(
    (doctorId: string) => {
      setLinks((prev) => prev.filter((x) => x.doctorId !== doctorId));
      emitClinicDoctorLinkDelta(clinicId, -1);
    },
    [clinicId],
  );

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Врачи
        </h2>
        <ClinicDoctorLinkPanel
          clinicId={clinicId}
          linkedDoctorIds={links.map((l) => l.doctorId)}
          onDoctorLinked={onDoctorLinked}
        />
      </div>
      {activeLinks.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Нет привязанных врачей. Добавьте врача кнопкой выше («Из базы» или
          «Новый врач»). Связь также появляется при сохранении наряда с этой
          клиникой.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
          {activeLinks.map((l) => (
            <li
              key={l.doctorId}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0"
            >
              <Link
                href={`/clients/doctors/${l.doctor.id}`}
                className="min-w-0 font-medium text-[var(--sidebar-blue)] hover:underline"
              >
                {l.doctor.fullName}
              </Link>
              <DoctorClinicUnlinkButton
                clinicId={clinicId}
                doctorId={l.doctor.id}
                counterpartyLabel={l.doctor.fullName}
                onAfterUnlink={() => onDoctorUnlinked(l.doctor.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
