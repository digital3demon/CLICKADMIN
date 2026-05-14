import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { MailLayout } from "@/components/mail/MailLayout";

export const dynamic = "force-dynamic";

export default function MailPage() {
  return (
    <ModuleFrame
      title="Почта"
      description="Яндекс.Почта внутри CRM: 3-колоночный клиент, app password, IMAP/SMTP, папки, метки, вложения и быстрые действия."
      descriptionClassName="max-w-4xl"
    >
      <MailLayout />
    </ModuleFrame>
  );
}
