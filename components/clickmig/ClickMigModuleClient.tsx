"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClickMigApplicationsTable } from "./ClickMigApplicationsTable";
import { ClickMigOrdersTable } from "./ClickMigOrdersTable";

export function ClickMigModuleClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "orders" ? "orders" : "applications";

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-[var(--card-border)]">
        <Link
          href="/clickmig"
          className={`px-3 py-2 text-sm ${tab === "applications" ? "border-b-2 border-[var(--sidebar-blue)] font-medium" : "text-[var(--muted)]"}`}
        >
          Заявки
        </Link>
        <Link
          href="/clickmig?tab=orders"
          className={`px-3 py-2 text-sm ${tab === "orders" ? "border-b-2 border-[var(--sidebar-blue)] font-medium" : "text-[var(--muted)]"}`}
        >
          Заказы
        </Link>
      </div>
      {tab === "orders" ? <ClickMigOrdersTable /> : <ClickMigApplicationsTable />}
    </div>
  );
}
