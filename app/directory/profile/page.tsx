import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ProfileSettingsForm } from "@/components/directory/ProfileSettingsForm";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-constants";

export const dynamic = "force-dynamic";

export default async function DirectoryProfilePage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/profile");

  let telegramTenantSlug = DEFAULT_TENANT_SLUG;
  if (session.tid) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tid },
      select: { slug: true },
    });
    if (tenant?.slug) telegramTenantSlug = tenant.slug;
  }

  const telegramBot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME?.trim();
  const telegramNotifyEnabled =
    Boolean(telegramBot) && !session.demo && !isSingleUserPortable();

  return (
    <ModuleFrame
      title="Настройка профиля"
      description="Аватар, имя, ник для @упоминаний. Привязка Telegram и уведомления о канбане/Kaiten — ниже."
    >
      <ProfileSettingsForm
        telegramNotifyEnabled={telegramNotifyEnabled}
        telegramBotUsername={telegramBot ?? ""}
        telegramTenantSlugForDeepLink={telegramTenantSlug}
      />
      <p className="mt-10 text-sm text-[var(--text-muted)]">
        <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
          ← К конфигурации
        </Link>
      </p>
    </ModuleFrame>
  );
}
