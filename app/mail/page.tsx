import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { MailClient } from "@/components/mail/MailClient";

export const dynamic = "force-dynamic";

export default function MailPage() {
  return (
    <ModuleFrame
      title="Почта"
      description="Общие ящики Яндекс.Почты внутри CRM: синхронизация входящих, отправка писем, вложения, привязки к заказам/клиникам/врачам и правила обработки по каждому ящику."
      descriptionClassName="max-w-4xl"
    >
      <MailClient defaultEmail="main@digitaldemon.studio" />
    </ModuleFrame>
  );
}
