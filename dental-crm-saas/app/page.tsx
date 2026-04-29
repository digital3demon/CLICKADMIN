import { headers } from "next/headers";
import { DashboardActions } from "@/components/home/DashboardActions";
import { PortalCompanyForm } from "@/components/portal/PortalCompanyForm";
import { getAttentionReminders } from "@/lib/attention-reminders";
import { getHomeGreetingDisplayName } from "@/lib/home-greeting-name";
import { isPortalCrmHost } from "@/lib/tenant-slug";

/** Стартовое окно: приветствие, быстрые действия (в т.ч. ссылка в «Внимание»), отгрузки, новый заказ. Список напоминаний — в сайдбаре слева. */
export default async function HomePage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  if (isPortalCrmHost(host)) {
    const base =
      process.env.CRM_TENANT_BASE_HOST?.trim() || "click-lab.online";
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <PortalCompanyForm baseHost={`{префикс}.${base}`} />
      </div>
    );
  }

  const [attentionItems, greetingName] = await Promise.all([
    getAttentionReminders(),
    getHomeGreetingDisplayName(),
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10 lg:px-8 lg:py-12">
      <div className="flex w-full max-w-5xl flex-col gap-5 lg:max-w-6xl lg:gap-6">
        <section
          aria-label="Приветствие"
          className="flex flex-col items-center justify-center rounded-lg border-2 border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-14 shadow-sm sm:py-16 md:py-20 lg:py-24"
        >
          <h1 className="max-w-full text-balance text-center text-3xl font-semibold leading-tight tracking-tight text-[var(--app-text)] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Привет, {greetingName}
          </h1>
        </section>

        <DashboardActions attentionCount={attentionItems.length} />
      </div>
    </div>
  );
}
