"use client";

import { Suspense, useLayoutEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { fontDisplay } from "@/lib/app-fonts";
import {
  crmModuleListSnapshotKey,
  readCrmModuleListSnapshot,
  type CrmModuleListSnapshot as Snapshot,
} from "@/lib/crm-module-list-snapshot";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { CrmModuleTitleLoading } from "@/components/layout/CrmModuleTitleLoading";

export function CrmModuleListSnapshot({ title }: { title: string }) {
  return (
    <Suspense fallback={<CrmModuleTitleLoading title={title} />}>
      <CrmModuleListSnapshotInner title={title} />
    </Suspense>
  );
}

function CrmModuleListSnapshotInner({ title }: { title: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useLayoutEffect(() => {
    const key = crmModuleListSnapshotKey(pathname ?? "", searchParams.toString());
    setSnap(readCrmModuleListSnapshot(key));
  }, [pathname, searchParams]);

  if (!snap || snap.rows.length === 0) {
    return <CrmModuleTitleLoading title={title} />;
  }

  return (
    <div className="px-3 pt-6 sm:px-6 sm:pt-8" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1
          className={`${fontDisplay.className} break-words text-xl font-semibold tracking-tight text-[var(--app-text)] lg:text-2xl`}
        >
          {title}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Обновляю…</p>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
        <table className="w-full min-w-[36rem] table-fixed border-separate border-spacing-0 text-center text-sm">
          <thead>
            <tr className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
              <th className="w-[5.5rem] px-2 py-2 font-medium">№</th>
              <th className="px-2 py-2 font-medium">Пациент</th>
              <th className="px-2 py-2 font-medium">Врач</th>
              <th className="hidden px-2 py-2 font-medium sm:table-cell">Клиника</th>
              <th className="px-2 py-2 font-medium">Колонка</th>
              <th className="w-[5rem] px-2 py-2 font-medium">Оплата</th>
            </tr>
          </thead>
          <tbody>
            {snap.rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-[var(--card-border)] text-[var(--text-body)]"
              >
                <td className="px-2 py-2 font-medium text-[var(--text-strong)]">
                  {r.orderNumber}
                </td>
                <td className="px-2 py-2">{r.patientName || "—"}</td>
                <td className="px-2 py-2">
                  {personNameSurnameInitials(r.doctorName) || "—"}
                </td>
                <td className="hidden px-2 py-2 sm:table-cell">
                  {r.clinicName || "—"}
                </td>
                <td className="px-2 py-2">{r.columnTitle || "—"}</td>
                <td className="px-2 py-2">{r.payment || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="sr-only">Показываю предыдущий список, обновляю данные</span>
    </div>
  );
}
