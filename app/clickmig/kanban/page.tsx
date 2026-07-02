import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ClickMigKanbanBoard } from "@/components/clickmig/ClickMigKanbanBoard";

export const dynamic = "force-dynamic";

export default function ClickMigKanbanPage() {
  return (
    <ModuleFrame title="КликМиг — канбан" description="5 колонок, таймеры, проверка данных">
      <ClickMigKanbanBoard />
    </ModuleFrame>
  );
}
