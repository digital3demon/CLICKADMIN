import { Suspense } from "react";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { OrdersCorrectionsHistoryTable } from "@/components/orders/OrdersCorrectionsHistoryTable";
import { OrdersHistorySearch } from "@/components/orders/OrdersHistorySearch";
import { OrdersHistoryTabNav } from "@/components/orders/OrdersHistoryTabNav";
import { OrdersHistoryTable } from "@/components/orders/OrdersHistoryTable";
import { parseOrdersHistoryTab } from "@/lib/corrections-history";
import { loadCorrectionsHistoryMerged } from "@/lib/corrections-history.server";
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

  let changesItems = [] as Awaited<ReturnType<typeof loadRevisionsHistoryMerged>>;
  let correctionsItems = [] as Awaited<ReturnType<typeof loadCorrectionsHistoryMerged>>;

  try {
    if (tab === "changes") {
      changesItems = await loadRevisionsHistoryMerged({ q });
    } else {
      correctionsItems = await loadCorrectionsHistoryMerged({ q });
    }
  } catch (e) {
    console.error("[orders/history]", e);
  }

  const isCorrections = tab === "corrections";
  const itemCount = isCorrections ? correctionsItems.length : changesItems.length;
  const limitReached = itemCount >= 150;

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
            isCorrections ? (
              <OrdersCorrectionsHistoryTable items={[]} />
            ) : (
              <OrdersHistoryTable items={[]} />
            )
          ) : (
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
              {isCorrections
                ? "Журнал корректировок и заявок по протетике пуст."
                : "Журнал пуст. После сохранения нарядов и карточек клиентов здесь появятся записи."}
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
            {isCorrections ? (
              <OrdersCorrectionsHistoryTable items={correctionsItems} />
            ) : (
              <OrdersHistoryTable items={changesItems} />
            )}
          </>
        )}
      </div>
    </ModuleFrame>
  );
}
