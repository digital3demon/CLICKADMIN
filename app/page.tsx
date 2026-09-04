import { DashboardActions } from "@/components/home/DashboardActions";
import { OwnerViewAsRoleControl } from "@/components/home/OwnerViewAsRoleControl";
import { getAttentionReminders } from "@/lib/attention-reminders";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getHomeGreetingDisplayName } from "@/lib/home-greeting-name";

/** Стартовое окно: приветствие, быстрые действия, отгрузки и новый заказ. */
export default async function HomePage() {
  const [attentionItems, greetingName, session] = await Promise.all([
    getAttentionReminders(),
    getHomeGreetingDisplayName(),
    getSessionFromCookies(),
  ]);
  const actualRole = session?.actualRole ?? session?.role;

  return (
    <div className="crm-mobile-menu-pad flex min-h-dvh items-center justify-center px-5 py-10 shell-laptop:px-8 shell-laptop:py-12">
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
        {actualRole === "OWNER" && session ? (
          <OwnerViewAsRoleControl currentRole={session.role} />
        ) : null}
      </div>
    </div>
  );
}
