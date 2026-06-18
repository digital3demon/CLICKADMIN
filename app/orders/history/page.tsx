import { Suspense } from "react";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { OrdersHistorySearch } from "@/components/orders/OrdersHistorySearch";
import { OrdersHistoryTable } from "@/components/orders/OrdersHistoryTable";
import {
  normalizeRevisionsHistorySearchQuery,
} from "@/lib/revisions-history";
import { loadRevisionsHistoryMerged } from "@/lib/revisions-history.server";

export const dynamic = "force-dynamic";

export default async function OrdersHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = normalizeRevisionsHistorySearchQuery(sp.q);

  let merged = [] as Awaited<ReturnType<typeof loadRevisionsHistoryMerged>>;
  try {
    merged = await loadRevisionsHistoryMerged({ q });
  } catch (e) {
    console.error("[orders/history]", e);
  }

  return (
    <ModuleFrame title="История изменений">
      <div className="min-w-0 space-y-4">
        <div className="no-print rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <Suspense fallback={null}>
            <OrdersHistorySearch initialValue={q} />
          </Suspense>
        </div>

        {merged.length === 0 ? (
          q ? (
            <OrdersHistoryTable items={[]} />
          ) : (
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
              Журнал пуст. После сохранения нарядов и карточек клиентов здесь
              появятся записи.
            </div>
          )
        ) : (
          <>
            {q ? (
              <p className="text-xs text-[var(--text-muted)]">
                Найдено записей: {merged.length}
                {merged.length >= 150 ? " (показаны первые 150)" : ""}
              </p>
            ) : null}
            <OrdersHistoryTable items={merged} />
          </>
        )}
      </div>
    </ModuleFrame>
  );
}
