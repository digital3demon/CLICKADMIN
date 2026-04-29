import Link from "next/link";
import { redirect } from "next/navigation";
import { CostingDirectoryClient } from "@/components/directory/CostingDirectoryClient";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { canAccessCostingModule } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function DirectoryCostingPage() {
  const s = await getSessionFromCookies();
  if (!s) redirect("/login?next=/directory/costing");
  if (!canAccessCostingModule(s.role)) redirect("/directory");

  return (
    <ModuleFrame
      title="Просчёт работ"
      description="Таблица по позициям: статьи затрат, формулы, общие пулы, профили со скидкой. Чистая прибыль: выручка по таблице минус постоянные расходы версии (аренда, оклады, коммуналка…). Дальше — связка с нарядами и аналитикой."
    >
      <CostingDirectoryClient />
      <p className="mt-8 text-sm">
        <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
          ← Конфигурация
        </Link>
      </p>
    </ModuleFrame>
  );
}
