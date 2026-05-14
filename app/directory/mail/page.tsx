import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { MailSettingsClient } from "@/components/mail/MailSettingsClient";

export const dynamic = "force-dynamic";

export default function MailSettingsPage() {
  return (
    <ModuleFrame
      title="Почта"
      description="Аккаунты Яндекс.Почты и правила обработки входящей почты."
      descriptionClassName="max-w-3xl"
    >
      <MailSettingsClient />
    </ModuleFrame>
  );
}
