import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { MailSettingsClient } from "@/components/mail/MailSettingsClient";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { hasMailSettingsPageAccess } from "@/lib/mail/mail-service";
import type { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function MailSettingsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/directory/mail");

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) redirect("/login?next=/directory/mail");

  const db = (await getOrdersPrisma()) as PrismaClient;
  const canAccess = await hasMailSettingsPageAccess(db, tenantId, session.sub, session.role);
  if (!canAccess) redirect("/mail");

  const isOwner = session.role === "OWNER";

  return (
    <ModuleFrame
      title="Почта"
      description={
        isOwner
          ? "Подключение ящиков, доступ к письмам и настройкам, правила обработки входящей почты."
          : "Настройка папок, правил, меток и шаблона ответа для выбранных ящиков."
      }
      descriptionClassName="max-w-3xl"
    >
      <MailSettingsClient />
    </ModuleFrame>
  );
}
