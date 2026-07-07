"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClickMigApplicationsTable } from "./ClickMigApplicationsTable";
import { ClickMigOrdersTable } from "./ClickMigOrdersTable";
import { ClickMigPublicForm } from "./ClickMigPublicForm";

type Tab = "applications" | "orders" | "form";

function tabFromSearchParams(raw: string | null): Tab {
  if (raw === "orders") return "orders";
  if (raw === "form") return "form";
  return "applications";
}

export function ClickMigModuleClient() {
  const searchParams = useSearchParams();
  const tab = tabFromSearchParams(searchParams.get("tab"));

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
        <Link
          href="/clickmig?tab=form"
          className={`px-3 py-2 text-sm ${tab === "form" ? "border-b-2 border-[var(--sidebar-blue)] font-medium" : "text-[var(--muted)]"}`}
        >
          Форма заказа
        </Link>
      </div>
      {tab === "orders" ? (
        <ClickMigOrdersTable />
      ) : tab === "form" ? (
        <ClickMigPublicForm embedded />
      ) : (
        <ClickMigApplicationsTable />
      )}
    </div>
  );
}
