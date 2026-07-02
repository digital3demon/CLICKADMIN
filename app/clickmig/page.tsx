import { Suspense } from "react";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ClickMigModuleClient } from "@/components/clickmig/ClickMigModuleClient";

export const dynamic = "force-dynamic";

export default function ClickMigPage() {
  return (
    <ModuleFrame
      title="КликМиг"
      description="Заявки с сайта и упрощённые заказы. Принятие, канбан и таймеры — отдельный контур."
    >
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Загрузка…</p>}>
        <ClickMigModuleClient />
      </Suspense>
    </ModuleFrame>
  );
}
