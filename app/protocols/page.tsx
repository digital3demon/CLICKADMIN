import { ModuleFrame } from "@/components/layout/ModuleFrame";

export const dynamic = "force-dynamic";

export default function ProtocolsPage() {
  return (
    <ModuleFrame
      title="Протоколы и справочники"
      description="Раздел в разработке. Здесь появятся протоколы работ и справочные материалы лаборатории."
    >
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-10 text-center text-sm text-[var(--text-muted)]">
        Скоро: протоколы, шаблоны и справочники для сотрудников.
      </div>
    </ModuleFrame>
  );
}
