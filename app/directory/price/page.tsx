import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { PriceListDirectoryClient } from "@/components/directory/PriceListDirectoryClient";

export const dynamic = "force-dynamic";

export default function DirectoryPricePage() {
  return (
    <ModuleFrame
      title="Прайс"
      description="Несколько каталогов прайса; активный подставляется в наряды. Массовый импорт из Excel: npm run import:price (в скрипте — переменная PRICE_LIST_ID для выбора каталога)."
    >
      <PriceListDirectoryClient />
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
