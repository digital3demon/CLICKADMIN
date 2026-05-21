import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { MailSettingsClient } from "@/components/mail/MailSettingsClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function MailSettingsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/mail");
  if (session.role !== "OWNER") redirect("/mail");

  return (
    <ModuleFrame
      title="Почта"
      description="Владелец подключает ящики, выбирает роли доступа и настраивает правила обработки входящей почты."
      descriptionClassName="max-w-3xl"
    >
      <MailSettingsClient />
    </ModuleFrame>
  );
}
