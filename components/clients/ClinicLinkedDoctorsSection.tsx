"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { ClinicDoctorLinkPanel } from "@/components/clients/ClinicDoctorLinkPanel";
import { DoctorClinicUnlinkButton } from "@/components/clients/DoctorClinicUnlinkButton";
import {
  emitDoctorClinicLinkChanged,
  subscribeDoctorClinicLinkChanged,
} from "@/lib/client-link-sync-events";

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
  canEditClients,
  initialLinks,
}: {
  clinicId: string;
  canEditClients: boolean;
  initialLinks: ClinicDoctorLinkInitial[];
}) {
  const router = useRouter();
  const [links, setLinks] = useState<ClinicDoctorLinkInitial[]>(initialLinks);

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const activeLinks = useMemo(
    () => links.filter((l) => !isDeleted(l.doctor.deletedAt)),
    [links],
  );

  const refreshAfterLinkChange = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    return subscribeDoctorClinicLinkChanged((detail) => {
      if (detail.clinicId !== clinicId) return;
      if (detail.action === "link" && detail.doctor) {
        setLinks((prev) => {
          if (prev.some((x) => x.doctorId === detail.doctor!.id)) return prev;
          return [
            ...prev,
            {
              doctorId: detail.doctor!.id,
              doctor: {
                id: detail.doctor!.id,
                fullName: detail.doctor!.fullName,
                deletedAt: null,
              },
            },
          ];
        });
        return;
      }
      if (detail.action === "unlink") {
        setLinks((prev) => prev.filter((x) => x.doctorId !== detail.doctorId));
      }
    });
  }, [clinicId]);

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
      emitDoctorClinicLinkChanged({
        clinicId,
        doctorId: doctor.id,
        action: "link",
        doctor,
      });
      refreshAfterLinkChange();
    },
    [clinicId, refreshAfterLinkChange],
  );

  const onDoctorUnlinked = useCallback(
    (doctorId: string) => {
      setLinks((prev) => prev.filter((x) => x.doctorId !== doctorId));
      emitDoctorClinicLinkChanged({
        clinicId,
        doctorId,
        action: "unlink",
      });
      refreshAfterLinkChange();
    },
    [clinicId, refreshAfterLinkChange],
  );

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Врачи
        </h2>
        <ClinicDoctorLinkPanel
          clinicId={clinicId}
          canEditClients={canEditClients}
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
                canEditClients={canEditClients}
                onAfterUnlink={() => onDoctorUnlinked(l.doctor.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
