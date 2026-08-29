import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const WorkExamplesApp = nextDynamic(
  () =>
    import("@/components/work-examples/WorkExamplesApp").then((m) => ({
      default: m.WorkExamplesApp,
    })),
  {
    loading: () => (
      <p className="px-3 pt-6 text-sm text-[var(--text-muted)] sm:px-6 sm:pt-8">
        Загрузка примеров работ…
      </p>
    ),
  },
);

export default function WorkExamplesPage() {
  return <WorkExamplesApp />;
}
