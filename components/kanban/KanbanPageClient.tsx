"use client";

import { KanbanApp } from "@/components/kanban/KanbanApp";

/** Клиентская обёртка маршрута /kanban — без outer dynamic (на мобиле чанк зависал). */
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
