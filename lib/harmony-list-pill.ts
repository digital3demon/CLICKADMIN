import type { BadgeVariant } from "@/components/ui/Badge";
import {
  getKaitenColumnDisplayFromOrder,
  labWorkStatusFromColumnTitle,
  resolveKaitenColumnTitleForDisplay,
} from "@/lib/order-status-display";
import type { LabWorkStatus } from "@/lib/lab-work-status";
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
  | "redSolid"
  | "stone"
  | "violet"
  | "teal"
  | "cyan"
  | "indigo"
  | "purple";

/** Этапы лаборатории в списке заказов (Harmony): без красного и сигнальных тонов. */
export const LAB_WORK_STATUS_HARMONY_TONE: Record<LabWorkStatus, HarmonyPillTone> = {
  TO_SCAN: "stone",
  TO_EXECUTION: "gray",
  APPROVAL: "violet",
  PRODUCTION: "stone",
  ASSEMBLY: "teal",
  PROCESSING: "cyan",
  MANUAL: "indigo",
  TO_REVIEW: "purple",
  TO_ADMINS: "green",
};

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
  const title = resolveKaitenColumnTitleForDisplay(opts);
  const labStatus = labWorkStatusFromColumnTitle(title);
  if (labStatus) return LAB_WORK_STATUS_HARMONY_TONE[labStatus];
  const display = getKaitenColumnDisplayFromOrder(opts);
  return BADGE_TO_HARMONY[display.variant] ?? "gray";
}
