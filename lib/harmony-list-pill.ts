import type { BadgeVariant } from "@/components/ui/Badge";
import { getKaitenColumnDisplayFromOrder } from "@/lib/order-status-display";
import {
  canonicalOrderPayment,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PAID,
  ORDER_PAYMENT_PARTIAL,
  ORDER_PAYMENT_RECON_PAID,
  ORDER_PAYMENT_RECON_UNPAID,
} from "@/lib/order-clinic-client-fields";

export type HarmonyPillTone =
  | "blue"
  | "yellow"
  | "green"
  | "red"
  | "gray"
  | "redSolid";

const BADGE_TO_HARMONY: Record<BadgeVariant, HarmonyPillTone> = {
  blue: "blue",
  yellow: "yellow",
  green: "green",
  red: "red",
  gray: "gray",
  purple: "blue",
  default: "gray",
};

export function harmonyPillClassName(tone: HarmonyPillTone): string {
  return `harmony-status-pill harmony-status-pill--${tone}`;
}

/** Класс pill в списке: harmony outline или классический tailwind. */
export function resolveListPillClass(
  isHarmony: boolean,
  classicClass: string,
  tone: HarmonyPillTone,
): string {
  if (!isHarmony) return classicClass;
  return harmonyPillClassName(tone);
}

export function paymentValueToHarmonyTone(paymentValue: string): HarmonyPillTone {
  const p = canonicalOrderPayment(paymentValue.trim());
  if (p === ORDER_PAYMENT_PAID || p === ORDER_PAYMENT_RECON_PAID) return "green";
  if (p === ORDER_PAYMENT_PARTIAL) return "yellow";
  if (p === ORDER_PAYMENT_RECON_UNPAID) return "blue";
  if (p === ORDER_PAYMENT_NOT_PAID) return "red";
  return "red";
}

export function kaitenOrderToHarmonyTone(opts: {
  kaitenColumnTitle?: string | null;
  demoKanbanColumn?: string | null;
}): HarmonyPillTone {
  const display = getKaitenColumnDisplayFromOrder(opts);
  return BADGE_TO_HARMONY[display.variant] ?? "blue";
}
