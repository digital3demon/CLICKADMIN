import type { SubscriptionPlan } from "@prisma/client";

export function planAllowsShipments(p: SubscriptionPlan): boolean {
  return p === "OPTIMAL" || p === "ULTRA";
}

export function planAllowsHistoryAndAnalytics(p: SubscriptionPlan): boolean {
  return p === "OPTIMAL" || p === "ULTRA";
}

export function planAllowsCosting(p: SubscriptionPlan): boolean {
  return p === "ULTRA";
}

export function planAllowsInventory(p: SubscriptionPlan): boolean {
  return p === "ULTRA";
}

/**
 * Канбан: явный аддон `Tenant.addonKanban` или тарифы OPTIMAL/ULTRA,
 * чтобы самостоятельный сервер с полным тарифом не оставался без доски из‑за флага по умолчанию.
 */
export function canAccessKanban(
  plan: SubscriptionPlan,
  addonKanban: boolean,
): boolean {
  if (addonKanban) return true;
  return plan === "OPTIMAL" || plan === "ULTRA";
}
