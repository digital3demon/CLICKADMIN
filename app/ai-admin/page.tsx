import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { AiAdminClient } from "./AiAdminClient";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";

export const metadata = { title: "ИИ-Админ" };

export default async function AiAdminPage() {
  const s = await getSessionFromCookies();
  if (!s || (s.role !== "OWNER" && s.actualRole !== "OWNER")) {
    redirect("/");
  }

  if (s.demo) {
    return (
      <ModuleFrame title="ИИ-Админ">
        <div className="flex min-h-[min(52vh,28rem)] items-center justify-center px-6 py-16">
          <p className="text-center text-2xl font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
            В РАЗРАБОТКЕ
          </p>
        </div>
      </ModuleFrame>
    );
  }

  const db = await getOrdersPrisma();
  const tenant = await db.tenant.findUnique({
    where: { id: s.tid },
    select: { aiEnabled: true, aiApiKey: true, aiModel: true },
  });

  return (
    <AiAdminClient
      initialAiEnabled={tenant?.aiEnabled ?? false}
      hasApiKey={Boolean(tenant?.aiApiKey)}
      initialAiModel={tenant?.aiModel}
    />
  );
}
