import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";
import type { PrismaClient } from "@prisma/client";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { canOpenMailSettingsModule } from "@/lib/mail/mail-settings-access";

const MailSettingsClient = nextDynamic(
  () =>
    import("@/components/mail/MailSettingsClient").then((m) => ({
      default: m.MailSettingsClient,
    })),
  {
    loading: () => (
      <p className="text-sm text-[var(--text-muted)]">Загрузка настроек почты…</p>
    ),
  },
);

export const dynamic = "force-dynamic";

export default async function MailSettingsPage() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session) redirect("/login?next=/directory/mail");

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) redirect("/login?next=/directory/mail");

  const db = (await getOrdersPrisma()) as PrismaClient;
  const canAccess = await canOpenMailSettingsModule(
    db,
    tenantId,
    session.sub,
    session.role,
    access ?? undefined,
  );
  if (!canAccess) redirect(session.role === "OWNER" ? "/directory" : "/mail");

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
