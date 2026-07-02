import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ClickMigConfigClient } from "@/components/clickmig/ClickMigConfigClient";

export const dynamic = "force-dynamic";

export default function DirectoryClickMigPage() {
  return (
    <ModuleFrame
      title="Конфигурация КликМиг"
      description="Справочники, SMTP, API key, участники и таймеры"
    >
      <ClickMigConfigClient />
    </ModuleFrame>
  );
}
