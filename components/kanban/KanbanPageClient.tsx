"use client";

import dynamic from "next/dynamic";

const KanbanApp = dynamic(
  () => import("@/components/kanban/KanbanApp").then((m) => m.KanbanApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh min-h-0 w-full items-center justify-center bg-[var(--kanban-workspace-bg)] text-sm text-[var(--kanban-text-muted)]">
        Загрузка канбана…
      </div>
    ),
  },
);

export function KanbanPageClient({
  isDemo,
  kaitenIntegrationActive,
}: {
  isDemo: boolean;
  kaitenIntegrationActive: boolean;
}) {
  return (
    <KanbanApp
      isDemo={isDemo}
      kaitenIntegrationActive={kaitenIntegrationActive}
    />
  );
}
