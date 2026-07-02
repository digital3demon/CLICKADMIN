import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ClickMigApplicationDetail } from "@/components/clickmig/ClickMigApplicationDetail";

export const dynamic = "force-dynamic";

export default async function ClickMigApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModuleFrame title="Заявка КликМиг" description="Проверка и принятие заявки">
      <ClickMigApplicationDetail id={id} />
    </ModuleFrame>
  );
}
