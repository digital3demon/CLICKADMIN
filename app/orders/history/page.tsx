import { Suspense } from "react";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { OrdersCorrectionsHistoryTable } from "@/components/orders/OrdersCorrectionsHistoryTable";
import { OrdersHistorySearch } from "@/components/orders/OrdersHistorySearch";
import { OrdersHistoryTabNav } from "@/components/orders/OrdersHistoryTabNav";
import { OrdersHistoryTable } from "@/components/orders/OrdersHistoryTable";
import { OrdersProstheticsHistoryTable } from "@/components/orders/OrdersProstheticsHistoryTable";
import { canAcceptOrderChatCorrections } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { parseOrdersHistoryTab } from "@/lib/corrections-history";
import {
  loadCorrectionsHistoryOnly,
  loadProstheticsHistoryOnly,
} from "@/lib/corrections-history.server";
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
  const canMarkArrived =
    session != null && canAcceptOrderChatCorrections(session.role);

  let changesItems = [] as Awaited<ReturnType<typeof loadRevisionsHistoryMerged>>;
  let correctionsItems = [] as Awaited<
    ReturnType<typeof loadCorrectionsHistoryOnly>
  >;
  let prostheticsItems = [] as Awaited<
    ReturnType<typeof loadProstheticsHistoryOnly>
  >;

  try {
    if (tab === "changes") {
      changesItems = await loadRevisionsHistoryMerged({ q });
    } else if (tab === "corrections") {
      correctionsItems = await loadCorrectionsHistoryOnly({ q });
    } else {
      prostheticsItems = await loadProstheticsHistoryOnly({ q });
    }
  } catch (e) {
    console.error("[orders/history]", e);
  }

  const itemCount =
    tab === "corrections"
      ? correctionsItems.length
      : tab === "prosthetics"
        ? prostheticsItems.length
        : changesItems.length;
  const limitReached = itemCount >= 150;

  const emptyMessage =
    tab === "corrections"
      ? "Журнал корректировок пуст."
      : tab === "prosthetics"
        ? "Журнал заказов протетики пуст."
        : "Журнал пуст. После сохранения нарядов и карточек клиентов здесь появятся записи.";

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
            ) : (
              <OrdersHistoryTable items={changesItems} />
            )}
          </>
        )}
      </div>
    </ModuleFrame>
  );
}
