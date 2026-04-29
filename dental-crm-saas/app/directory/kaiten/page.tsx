import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { KaitenDirectoryClient } from "@/components/directory/KaitenDirectoryClient";

export const dynamic = "force-dynamic";

export default function DirectoryKaitenPage() {
  return (
    <ModuleFrame
      title="Кайтен"
      description="Типы карточек Kaiten: кнопка «Обновить ID из Kaiten» подтягивает type_id из API. Доски и колонки — в .env (KAITEN_*_BOARD_ID и т.д.)."
    >
      <KaitenDirectoryClient />
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
