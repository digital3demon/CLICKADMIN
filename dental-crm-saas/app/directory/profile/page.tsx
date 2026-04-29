import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ProfileSettingsForm } from "@/components/directory/ProfileSettingsForm";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

export default async function DirectoryProfilePage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/profile");

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
      />
      <p className="mt-10 text-sm text-[var(--text-muted)]">
        <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
          ← К конфигурации
        </Link>
      </p>
    </ModuleFrame>
  );
}
