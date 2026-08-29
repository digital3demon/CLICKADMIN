import nextDynamic from "next/dynamic";
import { ModuleFrame } from "@/components/layout/ModuleFrame";

export const dynamic = "force-dynamic";

const WorkExamplesTrash = nextDynamic(
  () =>
    import("@/components/work-examples/WorkExamplesTrash").then((m) => ({
      default: m.WorkExamplesTrash,
    })),
  {
    loading: () => (
      <p className="text-sm text-[var(--text-muted)]">Загрузка корзины…</p>
    ),
  },
);

export default function WorkExamplesTrashPage() {
  return (
    <ModuleFrame
      title="Корзина примеров"
      description="Восстановление в течение 5 суток. Подписи — московское время."
    >
      <WorkExamplesTrash />
    </ModuleFrame>
  );
}
