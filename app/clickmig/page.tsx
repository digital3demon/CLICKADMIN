import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ClickMigModuleClient } from "@/components/clickmig/ClickMigModuleClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function ClickMigPage() {
  const session = await getSessionFromCookies();
  if (session?.demo) redirect("/orders");

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
