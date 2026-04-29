import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { OrderImportExportClient } from "@/components/directory/OrderImportExportClient";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";

export const dynamic = "force-dynamic";

export default async function DirectoryOrdersImportExportPage() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session) {
    redirect("/login?next=/directory/orders-import-export");
  }
  if (access?.CONFIG_PRICING !== true && session.role !== "OWNER") {
    redirect("/directory");
  }

  return (
    <ModuleFrame
      title="Экспорт / Импорт работ"
      description="Экспорт заказов в шаблон занесения и импорт из .xlsx с предпросмотром, подсветкой проблем и ручной правкой перед сохранением."
    >
      <OrderImportExportClient />
      <p className="mt-8 text-sm">
        <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
          ← Конфигурация
        </Link>
      </p>
    </ModuleFrame>
  );
}
