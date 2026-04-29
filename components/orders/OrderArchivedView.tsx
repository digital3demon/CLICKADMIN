"use client";

import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ArchivedOrderRestoreButton } from "@/components/orders/ArchivedOrderRestoreButton";

export function OrderArchivedView({
  orderId,
  orderNumber,
  patientName,
  clinicName,
  doctorName,
  archivedAtIso,
}: {
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  clinicName: string | null;
  doctorName: string;
  archivedAtIso: string;
}) {
  const archivedLabel = new Date(archivedAtIso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ModuleFrame
      title={`Наряд ${orderNumber}`}
      description="Наряд находится в архиве и скрыт из списков и канбана. Номер наряда сохранён."
      titleRowEnd={
        <Link
          href="/orders/archived"
          className="text-[0.7rem] font-light tracking-wide text-[var(--text-muted)] hover:text-[var(--app-text)] hover:underline"
        >
          Архив
        </Link>
      }
    >
      <div className="max-w-xl space-y-4 text-sm text-[var(--app-text)]">
        <p className="text-[var(--text-muted)]">
          В архив с {archivedLabel}
        </p>
        <dl className="space-y-2">
          {patientName?.trim() ? (
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Пациент</dt>
              <dd>{patientName.trim()}</dd>
            </div>
          ) : null}
          {clinicName?.trim() ? (
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Клиника</dt>
              <dd>{clinicName.trim()}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Врач</dt>
            <dd>{doctorName}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-3 pt-2">
          <ArchivedOrderRestoreButton orderId={orderId} />
          <Link
            href="/orders"
            className="inline-flex items-center rounded-md px-3 py-1.5 text-xs text-[var(--sidebar-blue)] hover:underline sm:text-sm"
          >
            ← К заказам
          </Link>
        </div>
      </div>
    </ModuleFrame>
  );
}
