import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Calculator,
  History,
  Inbox,
  Mail,
  Package,
  Settings,
  Kanban,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

const NAV_ICON_BY_HREF: Record<string, LucideIcon> = {
  "/orders": Inbox,
  "/kanban": Kanban,
  "/orders/history": History,
  "/analytics": BarChart2,
  "/payroll": Wallet,
  "/finance-office": Calculator,
  "/mail": Mail,
  "/shipments": Truck,
  "/warehouse": Package,
  "/clients": Users,
  "/directory": Settings,
};

export function sidebarNavIconForHref(href: string): LucideIcon | null {
  return NAV_ICON_BY_HREF[href] ?? null;
}
