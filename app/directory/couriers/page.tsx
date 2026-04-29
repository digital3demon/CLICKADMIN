import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { CouriersDirectoryClient } from "@/components/directory/CouriersDirectoryClient";

export const dynamic = "force-dynamic";

export default function DirectoryCouriersPage() {
  return (
    <ModuleFrame
      title="Курьеры"
      description="Справочник курьерских служб для поля «Курьер» в наряде."
    >
      <CouriersDirectoryClient />
      <p className="mt-8 text-sm">
        <Link
          href="/directory"
          className="text-[var(--sidebar-blue)] hover:underline"
        >
          ← Конфигурация
        </Link>
      </p>
    </ModuleFrame>
  );
}
