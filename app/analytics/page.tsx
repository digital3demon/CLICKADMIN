import nextDynamic from "next/dynamic";
import { ModuleFrame } from "@/components/layout/ModuleFrame";

export const dynamic = "force-dynamic";

const AnalyticsPageClient = nextDynamic(
  () =>
    import("@/components/analytics/AnalyticsPageClient").then((m) => ({
      default: m.AnalyticsPageClient,
    })),
  {
    loading: () => (
      <p className="text-sm text-[var(--text-muted)]">Загрузка модуля аналитики…</p>
    ),
  },
);

export default function AnalyticsPage() {
  return (
    <ModuleFrame
      title="Аналитика"
      description="Отчёты по выручке, прайсу, клиникам и врачам, складу и сверкам. Для вкладки «Сверки» используется выбор месяц/год и сравнение периодов. Выгрузка: Excel/PDF."
    >
      <AnalyticsPageClient />
    </ModuleFrame>
  );
}
