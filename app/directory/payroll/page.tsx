import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { PayrollConfigClient } from "@/components/payroll/PayrollConfigClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { canConfigurePayroll } from "@/lib/payroll";

export const dynamic = "force-dynamic";

export default async function DirectoryPayrollPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/payroll");
  if (!canConfigurePayroll(session.role)) redirect("/directory");

  return (
    <ModuleFrame
      title="ФОТ"
      description="Сделочные начисления для техников: ручная настройка, импорт и выгрузка Excel по позициям активного прайса и категориям CAD / Мануал / Обработка."
    >
      <PayrollConfigClient />
      <p className="mt-8 text-sm">
        <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
          ← К конфигурации
        </Link>
      </p>
    </ModuleFrame>
  );
}
