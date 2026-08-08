import { Suspense } from "react";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { OrdersCorrectionsHistoryTable } from "@/components/orders/OrdersCorrectionsHistoryTable";
import { OrdersHistorySearch } from "@/components/orders/OrdersHistorySearch";
import { OrdersHistoryTabNav } from "@/components/orders/OrdersHistoryTabNav";
import { OrdersHistoryTable } from "@/components/orders/OrdersHistoryTable";
import { OrdersProstheticsHistoryTable } from "@/components/orders/OrdersProstheticsHistoryTable";
import { OrdersTasksHistoryTable } from "@/components/orders/OrdersTasksHistoryTable";
import { canAcceptOrderChatCorrections } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { parseOrdersHistoryTab } from "@/lib/corrections-history";
import {
  loadCorrectionsHistoryOnly,
  loadProstheticsHistoryOnly,
} from "@/lib/corrections-history.server";
import { loadLabTasks } from "@/lib/lab-tasks.server";
import type { LabTaskJson } from "@/lib/lab-tasks";
import { normalizeRevisionsHistorySearchQuery } from "@/lib/revisions-history";
import { loadRevisionsHistoryMerged } from "@/lib/revisions-history.server";

export const dynamic = "force-dynamic";

export default async function OrdersHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab = parseOrdersHistoryTab(sp.tab);
  const q = normalizeRevisionsHistorySearchQuery(sp.q);
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  const canMarkArrived =
    session != null && canAcceptOrderChatCorrections(session.role);

  let changesItems = [] as Awaited<ReturnType<typeof loadRevisionsHistoryMerged>>;
  let correctionsItems = [] as Awaited<
    ReturnType<typeof loadCorrectionsHistoryOnly>
  >;
  let prostheticsItems = [] as Awaited<
    ReturnType<typeof loadProstheticsHistoryOnly>
  >;
  let tasksItems = [] as LabTaskJson[];
  let pickupsItems = [] as LabTaskJson[];

  try {
    if (tab === "changes") {
      changesItems = await loadRevisionsHistoryMerged({ q });
    } else if (tab === "corrections") {
      correctionsItems = await loadCorrectionsHistoryOnly({ q, tenantId });
    } else if (tab === "prosthetics") {
      prostheticsItems = await loadProstheticsHistoryOnly({ q, tenantId });
    } else if (tab === "tasks" && tenantId) {
      tasksItems = await loadLabTasks({
        tenantId,
        kind: "TASK",
        status: "all",
        limit: 150,
        q,
      });
    } else if (tab === "pickups" && tenantId) {
      pickupsItems = await loadLabTasks({
        tenantId,
        kind: "PICKUP_FROM",
        status: "all",
        limit: 150,
        q,
      });
    }
  } catch (e) {
    console.error("[orders/history]", e);
  }

  const itemCount =
    tab === "corrections"
      ? correctionsItems.length
      : tab === "prosthetics"
        ? prostheticsItems.length
        : tab === "tasks"
          ? tasksItems.length
          : tab === "pickups"
            ? pickupsItems.length
            : changesItems.length;
  const limitReached = itemCount >= 150;

  const emptyMessage =
    tab === "corrections"
      ? "Журнал корректировок пуст."
      : tab === "prosthetics"
        ? "Журнал заказов протетики пуст."
        : tab === "tasks"
          ? "Журнал задач пуст."
          : tab === "pickups"
            ? "Журнал «Забрать из» пуст."
            : "Журнал пуст. После сохранения нарядов и карточек клиентов здесь появятся записи.";

  const isLabNotesTab = tab === "tasks" || tab === "pickups";
  const labNotesItems = tab === "pickups" ? pickupsItems : tasksItems;

  return (
    <ModuleFrame title="История изменений">
      <div className="min-w-0 space-y-4">
        <OrdersHistoryTabNav active={tab} q={q} />

        <div className="no-print rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <Suspense fallback={null}>
            <OrdersHistorySearch initialValue={q} />
          </Suspense>
        </div>

        {itemCount === 0 ? (
          q ? (
            tab === "corrections" ? (
              <OrdersCorrectionsHistoryTable items={[]} />
            ) : tab === "prosthetics" ? (
              <OrdersProstheticsHistoryTable items={[]} />
            ) : isLabNotesTab ? (
              <OrdersTasksHistoryTable items={[]} />
            ) : (
              <OrdersHistoryTable items={[]} />
            )
          ) : (
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
              {emptyMessage}
            </div>
          )
        ) : (
          <>
            {q ? (
              <p className="text-xs text-[var(--text-muted)]">
                Найдено записей: {itemCount}
                {limitReached ? " (показаны первые 150)" : ""}
              </p>
            ) : null}
            {tab === "corrections" ? (
              <OrdersCorrectionsHistoryTable items={correctionsItems} />
            ) : tab === "prosthetics" ? (
              <OrdersProstheticsHistoryTable
                items={prostheticsItems}
                canMarkArrived={canMarkArrived}
              />
            ) : isLabNotesTab ? (
              <OrdersTasksHistoryTable items={labNotesItems} />
            ) : (
              <OrdersHistoryTable items={changesItems} />
            )}
          </>
        )}
      </div>
    </ModuleFrame>
  );
}
