import Link from "next/link";
import { notFound } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import {
  OrderEditForm,
  type OrderEditTab,
} from "@/components/orders/OrderEditForm";
import { OrderArchivedView } from "@/components/orders/OrderArchivedView";
import { canAcceptOrderChatCorrections, canEditOrders } from "@/lib/auth/permissions";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getPrisma } from "@/lib/get-prisma";
import { loadKaitenIntegrationTenantState } from "@/lib/kaiten-integration/settings";
import { decodeOrderPublicRef } from "@/lib/order-public-ref";
import { fetchOrderEditInitial } from "@/lib/order-edit-initial-fetcher";

export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstQuery(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function OrderEditPage({
  params,
  searchParams,
}: PageProps) {
  const resolved = params != null ? await params : null;
  const rawParam = resolved?.id?.trim() ?? "";
  if (!rawParam) notFound();
  const resolvedOrderId = decodeOrderPublicRef(rawParam) ?? rawParam;

  const sp = searchParams != null ? await searchParams : {};
  const tabQ = firstQuery(sp.tab);
  const initialActiveTab: OrderEditTab | undefined =
    tabQ === "history"
      ? "История"
      : tabQ === "documents" || tabQ === "docs" || tabQ === "edo"
        ? "Документооборот"
        : tabQ === "kaiten" || tabQ === "kanban"
          ? "Канбан/Кайтен"
          : undefined;

  const { session, access } = await getSessionWithModuleAccess();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) notFound();
  const isDemoMode = Boolean(session?.demo);

  let fetched;
  try {
    fetched = await fetchOrderEditInitial(tenantId, resolvedOrderId, session);
  } catch (e) {
    console.error("[order edit] prisma", e);
    return (
      <ModuleFrame title="Наряд" description="">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-medium">Ошибка базы данных</p>
          <p className="mt-2">
            Выполните{" "}
            <code className="rounded bg-amber-100 px-1">npx prisma db push</code>
          </p>
          <Link
            href="/orders"
            className="mt-4 inline-block text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            ← К заказам
          </Link>
        </div>
      </ModuleFrame>
    );
  }

  if (!fetched) notFound();

  if (fetched.archivedAt) {
    return (
      <OrderArchivedView
        orderId={fetched.initial.id}
        orderNumber={fetched.orderNumber}
        patientName={fetched.initial.patientName}
        clinicName={fetched.clinicName}
        doctorName={fetched.doctorName}
        archivedAtIso={fetched.archivedAt.toISOString()}
      />
    );
  }

  const canAcceptChatCorrections =
    session != null && canAcceptOrderChatCorrections(session.role);
  const canEditClients =
    session?.role === "OWNER" || access?.CLIENTS_EDIT === true;
  const canEditOrder =
    session != null && canEditOrders(session.role, access ?? undefined);

  let kaitenIntegrationActive = true;
  try {
    const prisma = await getPrisma();
    const integration = await loadKaitenIntegrationTenantState(
      prisma,
      tenantId,
    );
    kaitenIntegrationActive = integration.active;
  } catch {
    kaitenIntegrationActive = true;
  }

  return (
    <OrderEditForm
      initial={fetched.initial}
      initialActiveTab={initialActiveTab}
      isDemoMode={isDemoMode}
      kaitenIntegrationActive={kaitenIntegrationActive}
      kanbanCardUrl={fetched.kanbanAbs}
      demoKanbanCardTypes={fetched.demoKanbanCardTypes}
      canAcceptChatCorrections={canAcceptChatCorrections}
      canEditClients={canEditClients}
      canEditOrder={canEditOrder}
      viewerRole={session?.role ?? null}
      orderPageFrame={{
        title: `Наряд ${fetched.orderNumber}`,
      }}
    />
  );
}
