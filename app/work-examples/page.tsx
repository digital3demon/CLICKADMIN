import nextDynamic from "next/dynamic";
import { ModuleFrame } from "@/components/layout/ModuleFrame";

export const dynamic = "force-dynamic";

const WorkExamplesApp = nextDynamic(
  () =>
    import("@/components/work-examples/WorkExamplesApp").then((m) => ({
      default: m.WorkExamplesApp,
    })),
  {
    loading: () => (
      <p className="text-sm text-[var(--text-muted)]">Загрузка примеров работ…</p>
    ),
  },
);

export default function WorkExamplesPage() {
  return (
    <ModuleFrame
      title="Примеры работ"
      description="Портфолио лаборатории: фото, КАД, файлы и ссылка. По QR — витрина без номера наряда и фамилий."
    >
      <WorkExamplesApp />
    </ModuleFrame>
  );
}
