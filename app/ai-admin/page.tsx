import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { AiAdminClient } from "./AiAdminClient";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";

export const metadata = { title: "ИИ-Админ" };

export default async function AiAdminPage() {
  const s = await getSessionFromCookies();
  if (!s || (s.role !== "OWNER" && s.actualRole !== "OWNER")) {
    redirect("/");
  }

  const db = await getOrdersPrisma();
  const tenant = await db.tenant.findUnique({
    where: { id: s.tid },
    select: { aiEnabled: true, openRouterApiKey: true, openRouterModel: true },
  });

  return (
    <AiAdminClient 
      initialAiEnabled={tenant?.aiEnabled ?? false} 
      hasApiKey={Boolean(tenant?.openRouterApiKey)} 
      initialOpenRouterModel={tenant?.openRouterModel}
    />
  );
}
