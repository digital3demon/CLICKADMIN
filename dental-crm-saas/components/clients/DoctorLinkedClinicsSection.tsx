"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { DoctorClinicLinkPanel } from "@/components/clients/DoctorClinicLinkPanel";
import { DoctorClinicUnlinkButton } from "@/components/clients/DoctorClinicUnlinkButton";
import { emitDoctorClinicLinkDelta } from "@/lib/client-link-sync-events";

export type DoctorClinicLinkInitial = {
  clinicId: string;
  clinic: {
    id: string;
    name: string;
    address: string | null;
    deletedAt: Date | string | null;
  };
};

function isDeleted(
  deletedAt: DoctorClinicLinkInitial["clinic"]["deletedAt"],
): boolean {
  if (deletedAt == null) return false;
  return true;
}

export function DoctorLinkedClinicsSection({
  doctorId,
  initialLinks,
}: {
  doctorId: string;
  initialLinks: DoctorClinicLinkInitial[];
}) {
  const [links, setLinks] = useState<DoctorClinicLinkInitial[]>(initialLinks);

  const activeLinks = useMemo(
    () => links.filter((l) => !isDeleted(l.clinic.deletedAt)),
    [links],
  );

  const onClinicLinked = useCallback(
    (clinic: { id: string; name: string; address: string | null }) => {
      setLinks((prev) => {
        if (prev.some((x) => x.clinicId === clinic.id)) return prev;
        return [
          ...prev,
          {
            clinicId: clinic.id,
            clinic: {
              id: clinic.id,
              name: clinic.name,
              address: clinic.address,
              deletedAt: null,
            },
          },
        ];
      });
      emitDoctorClinicLinkDelta(doctorId, 1);
    },
    [doctorId],
  );

  const onClinicUnlinked = useCallback(
    (clinicId: string) => {
      setLinks((prev) => prev.filter((x) => x.clinicId !== clinicId));
      emitDoctorClinicLinkDelta(doctorId, -1);
    },
    [doctorId],
  );

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Клиники
        </h2>
        <DoctorClinicLinkPanel
          doctorId={doctorId}
          linkedClinicIds={links.map((l) => l.clinicId)}
          onClinicLinked={onClinicLinked}
        />
      </div>
      {activeLinks.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Нет привязанных клиник. Добавьте клинику кнопкой выше («Из базы» или
          «Новая клиника») или оформите наряд с этим врачом и клиникой.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
          {activeLinks.map((l) => (
            <li
              key={l.clinicId}
              className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/clients/${l.clinic.id}`}
                  className="font-medium text-[var(--sidebar-blue)] hover:underline"
                >
                  {l.clinic.name}
                </Link>
                {l.clinic.address?.trim() ? (
                  <p className="mt-1 text-xs text-[var(--text-secondary)] whitespace-pre-line">
                    {l.clinic.address}
                  </p>
                ) : null}
              </div>
              <DoctorClinicUnlinkButton
                clinicId={l.clinic.id}
                doctorId={doctorId}
                counterpartyLabel={l.clinic.name}
                onAfterUnlink={() => onClinicUnlinked(l.clinic.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
