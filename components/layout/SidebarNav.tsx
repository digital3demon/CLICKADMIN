"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppModule, UserRole } from "@prisma/client";
import {
  canAccessFinancialAnalytics,
  isKanbanOnlyUser,
} from "@/lib/auth/permissions";
import { hasDirectorySidebarAccess } from "@/lib/role-module-nav";
import {
  DEFAULT_SIDEBAR_HREF_ORDER,
  SIDEBAR_NAV_ORDER_KEY,
  coalesceSidebarNavOrder,
  normalizeSidebarNavOrder,
} from "@/lib/sidebar-nav-order";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { sidebarNavIconForHref } from "@/lib/sidebar-nav-icons";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { useDesktopSidebarCollapseOptional } from "@/components/layout/desktop-sidebar-collapse";
function isNavActive(pathname: string, href: string): boolean {
  if (href === "/orders") {
    return (
      pathname === "/orders" ||
      pathname === "/shipments" ||
      pathname.startsWith("/shipments/") ||
      (pathname.startsWith("/orders/") &&
        !pathname.startsWith("/orders/history"))
    );
  }
  if (href === "/analytics") {
    return pathname === "/analytics" || pathname.startsWith("/analytics/");
  }
  if (href === "/finance-office") {
    return pathname === "/finance-office" || pathname.startsWith("/finance-office/");
  }
  if (href === "/clickmig") {
    return pathname === "/clickmig" || pathname.startsWith("/clickmig/");
  }
  if (href === "/mail") {
    return pathname === "/mail" || pathname.startsWith("/mail/");
  }
  if (href === "/ai-admin") {
    return pathname === "/ai-admin" || pathname.startsWith("/ai-admin/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const baseNavItems: readonly {
  href: string;
  label: string;
  module: AppModule;
}[] = [
  { href: "/orders", label: "Заказы", module: "ORDERS" },
  { href: "/kanban", label: "Канбан", module: "KANBAN" },
  { href: "/orders/history", label: "История изменений", module: "ORDER_HISTORY" },
  { href: "/analytics", label: "Аналитика", module: "ANALYTICS" },
  { href: "/payroll", label: "Зарплата", module: "PAYROLL" },
  { href: "/finance-office", label: "ФинОтдел", module: "FINANCE_OFFICE" },
  { href: "/clickmig", label: "КликМиг", module: "CLICKMIG" },
  { href: "/mail", label: "Почта", module: "MAIL" },
  { href: "/ai-admin", label: "ИИ-Админ", module: "AI_ADMIN" },
  { href: "/warehouse", label: "Склад", module: "WAREHOUSE" },
  { href: "/work-examples", label: "Примеры работ", module: "WORK_EXAMPLES" },
  { href: "/protocols", label: "Протоколы и справочники", module: "PROTOCOLS_REFS" },
  { href: "/clients", label: "Клиенты", module: "CLIENTS_VIEW" },
  { href: "/directory", label: "Конфигурация", module: "DIRECTORY" },
];

const DEFAULT_HREF_ORDER = [...DEFAULT_SIDEBAR_HREF_ORDER];

function moveHref(list: string[], fromHref: string, toHref: string): string[] {
  const from = list.indexOf(fromHref);
  const to = list.indexOf(toHref);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

/** Вставить пункт сразу после `afterHref` (для зоны drop под строкой меню). */
function moveHrefAfter(list: string[], fromHref: string, afterHref: string): string[] {
  const from = list.indexOf(fromHref);
  const after = list.indexOf(afterHref);
  if (from < 0 || after < 0 || from === after) return list;
  const next = [...list];
  const [removed] = next.splice(from, 1);
  let insertAt = after + 1;
  if (from < after) insertAt -= 1;
  next.splice(insertAt, 0, removed);
  return next;
}

function DragHandleIcon() {
  return (
    <span className="flex flex-col gap-[3px] py-1" aria-hidden>
      <span className="block h-px w-3.5 rounded-full bg-current" />
      <span className="block h-px w-3.5 rounded-full bg-current" />
      <span className="block h-px w-3.5 rounded-full bg-current" />
    </span>
  );
}

function readLocalSidebarOrder(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeSidebarNavOrder(
      JSON.parse(window.localStorage.getItem(SIDEBAR_NAV_ORDER_KEY) || "null"),
    );
  } catch {
    return null;
  }
}

function writeLocalSidebarOrder(order: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_NAV_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* Браузерный fallback не критичен: основной источник — UserClientState в БД. */
  }
}

type SidebarNavOrderResponse = {
  found?: boolean;
  order?: unknown;
};

async function readSidebarOrderFromServer(): Promise<{
  found: boolean;
  order: string[] | null;
} | null> {
  try {
    const res = await fetch("/api/me/sidebar-nav-order", {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as SidebarNavOrderResponse;
    return {
      found: json.found === true,
      order: normalizeSidebarNavOrder(json.order),
    };
  } catch {
    return null;
  }
}

async function writeSidebarOrderToServer(order: string[]): Promise<boolean> {
  try {
    const res = await fetch("/api/me/sidebar-nav-order", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user, ready: sessionReady, isDemo } = useSessionUser();
  const role = user?.role ?? null;
  const moduleAccess = user?.moduleAccess ?? null;
  const [orderHrefs, setOrderHrefs] = useState<string[]>(DEFAULT_HREF_ORDER);
  const [mailUnreadCount, setMailUnreadCount] = useState(0);
  const [clickMigPendingCount, setClickMigPendingCount] = useState(0);
  const dragHrefRef = useRef<string | null>(null);

  const navItems = useMemo(() => {
    if (!sessionReady || role == null) {
      return baseNavItems;
    }
    const filterDemo = (items: typeof baseNavItems) =>
      isDemo ? items.filter((i) => i.href !== "/clickmig") : items;

    if (moduleAccess) {
      const a = moduleAccess as Record<AppModule, boolean>;
      if (isKanbanOnlyUser(role, a)) {
          return filterDemo(
          baseNavItems.filter(
            (i) =>
              i.href === "/kanban" ||
              i.href === "/protocols" ||
              (i.href === "/payroll" && a.PAYROLL === true) ||
              (i.href === "/work-examples" && a.WORK_EXAMPLES === true),
          ),
        );
      }
      return filterDemo(
        baseNavItems.filter((i) => {
          if (i.href === "/directory") {
            return hasDirectorySidebarAccess(a);
          }
          return a[i.module] === true;
        }),
      );
    }
    if (isKanbanOnlyUser(role)) {
      return filterDemo(
        baseNavItems.filter(
            (i) =>
              i.href === "/kanban" ||
              i.href === "/payroll" ||
              i.href === "/protocols",
          ),
      );
    }
    if (!canAccessFinancialAnalytics(role)) {
      return filterDemo(baseNavItems.filter((i) => i.href !== "/analytics"));
    }
    return filterDemo([...baseNavItems]);
  }, [role, moduleAccess, sessionReady, isDemo]);

  const mailNavVisible = useMemo(
    () => navItems.some((item) => item.href === "/mail"),
    [navItems],
  );

  useEffect(() => {
    if (!mailNavVisible) {
      setMailUnreadCount(0);
      return;
    }
    let cancelled = false;
    async function loadMailUnread() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/mail/unread", { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { unreadCount?: number };
        if (!cancelled) setMailUnreadCount(Math.max(0, Number(data.unreadCount) || 0));
      } catch {
        if (!cancelled) setMailUnreadCount(0);
      }
    }
    void loadMailUnread();
    const timer = window.setInterval(() => void loadMailUnread(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadMailUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mailNavVisible]);

  const clickMigNavVisible = useMemo(
    () => navItems.some((item) => item.href === "/clickmig"),
    [navItems],
  );

  useEffect(() => {
    if (!clickMigNavVisible) {
      setClickMigPendingCount(0);
      return;
    }
    let cancelled = false;
    async function loadPending() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/clickmig/pending-count", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (!cancelled) setClickMigPendingCount(Math.max(0, Number(data.count) || 0));
      } catch {
        if (!cancelled) setClickMigPendingCount(0);
      }
    }
    void loadPending();
    const timer = window.setInterval(() => void loadPending(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadPending();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [clickMigNavVisible]);

  useEffect(() => {
    const allowed = new Set(navItems.map((i) => i.href));
    let cancelled = false;
    void (async () => {
      const local = readLocalSidebarOrder();
      if (local) {
        setOrderHrefs(coalesceSidebarNavOrder(local, allowed));
      }
      const server = await readSidebarOrderFromServer();
      if (cancelled) return;
      if (server?.found && server.order) {
        const next = coalesceSidebarNavOrder(server.order, allowed);
        setOrderHrefs(next);
        writeLocalSidebarOrder(next);
        return;
      }
      if (local) {
        const next = coalesceSidebarNavOrder(local, allowed);
        setOrderHrefs(next);
        void writeSidebarOrderToServer(next);
        return;
      }
      setOrderHrefs((prev) => coalesceSidebarNavOrder(prev, allowed));
    })();
    return () => {
      cancelled = true;
    };
  }, [navItems]);

  const orderedNav = useMemo(() => {
    const by = new Map<string, (typeof navItems)[number]>(
      navItems.map((i) => [i.href, i]),
    );
    const hrefs = coalesceSidebarNavOrder(
      orderHrefs,
      new Set(navItems.map((i) => i.href)),
    );
    return hrefs
      .map((h) => by.get(h))
      .filter((x): x is (typeof navItems)[number] => x != null);
  }, [navItems, orderHrefs]);

  const persistOrder = useCallback((next: string[]) => {
    setOrderHrefs(next);
    writeLocalSidebarOrder(next);
    void writeSidebarOrderToServer(next);
  }, []);

  const onDragStart = useCallback((href: string) => {
    dragHrefRef.current = href;
  }, []);

  const onDragEnd = useCallback(() => {
    dragHrefRef.current = null;
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (targetHref: string) => (e: React.DragEvent) => {
      e.preventDefault();
      const from =
        dragHrefRef.current ??
        (e.dataTransfer.getData("text/plain") || null);
      dragHrefRef.current = null;
      if (!from || from === targetHref) return;
      const allowed = new Set(navItems.map((i) => i.href));
      const base = coalesceSidebarNavOrder(orderHrefs, allowed);
      persistOrder(moveHref(base, from, targetHref));
    },
    [navItems, orderHrefs, persistOrder],
  );

  const onDropAfter = useCallback(
    (afterHref: string) => (e: React.DragEvent) => {
      e.preventDefault();
      const from =
        dragHrefRef.current ??
        (e.dataTransfer.getData("text/plain") || null);
      dragHrefRef.current = null;
      if (!from || from === afterHref) return;
      const allowed = new Set(navItems.map((i) => i.href));
      const base = coalesceSidebarNavOrder(orderHrefs, allowed);
      persistOrder(moveHrefAfter(base, from, afterHref));
    },
    [navItems, orderHrefs, persistOrder],
  );

  const uiDesign = useUiDesign();
  const isHarmony = uiDesign === "harmony";
  const railCollapsed = useDesktopSidebarCollapseOptional()?.collapsed ?? false;

  return (
    <nav
      className={
        railCollapsed
          ? "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-1.5 pb-2 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          : isHarmony
            ? "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-3 pt-3 custom-scrollbar shell-short:px-2"
            : "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-3.5 pb-3 pt-5 shell-short:px-3 shell-short:pb-2 shell-short:pt-3"
      }
      aria-label="Разделы"
    >
      <ul className={railCollapsed || isHarmony ? "flex flex-col gap-1" : "flex flex-col gap-0"}>
        {orderedNav.map((item, index) => {
          const active = isNavActive(pathname, item.href);
          const Icon = sidebarNavIconForHref(item.href);
          const badge =
            item.href === "/mail" && mailUnreadCount > 0
              ? mailUnreadCount
              : item.href === "/clickmig" && clickMigPendingCount > 0
                ? clickMigPendingCount
                : 0;

          if (railCollapsed) {
            return (
              <li key={item.href} className="list-none">
                <Link
                  prefetch={false}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={[
                    "relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    active
                      ? "bg-[color-mix(in_srgb,var(--sidebar-blue)_16%,transparent)] text-[var(--sidebar-blue)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-text-strong)]",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  {Icon ? (
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  ) : (
                    <span className="text-[10px] font-semibold">{item.label.slice(0, 2)}</span>
                  )}
                  {badge > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sidebar-blue)] px-1 text-[9px] font-bold tabular-nums text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          }

          if (isHarmony) {
            return (
              <li key={item.href} className="list-none">
                {index > 0 ? (
                  <div
                    className="h-2 shrink-0"
                    aria-hidden
                    onDragOver={onDragOver}
                    onDrop={onDrop(item.href)}
                  />
                ) : null}
                <div
                  className="group flex items-stretch gap-0.5"
                  onDragOver={onDragOver}
                  onDrop={onDrop(item.href)}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      onDragStart(item.href);
                      e.dataTransfer.setData("text/plain", item.href);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={onDragEnd}
                    className="flex w-6 shrink-0 cursor-grab items-center justify-center rounded-lg border-0 bg-transparent text-[var(--text-muted)] opacity-40 hover:opacity-100 active:cursor-grabbing"
                    title="Перетащите, чтобы изменить порядок в меню"
                    aria-label={`Изменить порядок: ${item.label}`}
                  >
                    <DragHandleIcon />
                  </button>
                  <Link prefetch={false}
                    href={item.href}
                    draggable={false}
                    className={[
                      "relative flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[color-mix(in_srgb,var(--sidebar-blue)_12%,transparent)] text-[var(--sidebar-blue)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-text-strong)]",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    {Icon ? (
                      <Icon
                        className={`h-5 w-5 shrink-0 ${active ? "text-[var(--sidebar-blue)]" : "text-[var(--text-muted)]"}`}
                        aria-hidden
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.href === "/mail" && mailUnreadCount > 0 ? (
                      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-[var(--sidebar-blue-hover)] tabular-nums">
                        {mailUnreadCount > 99 ? "99+" : mailUnreadCount}
                      </span>
                    ) : null}
                    {item.href === "/clickmig" && clickMigPendingCount > 0 ? (
                      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-[var(--sidebar-blue-hover)] tabular-nums">
                        {clickMigPendingCount > 99 ? "99+" : clickMigPendingCount}
                      </span>
                    ) : null}
                  </Link>
                </div>
                <div
                  className="h-2 shrink-0"
                  aria-hidden
                  onDragOver={onDragOver}
                  onDrop={onDropAfter(item.href)}
                />
              </li>
            );
          }

          return (
            <li
              key={item.href}
              className="group flex items-stretch border-b border-[var(--sidebar-border)]/40 last:border-b-0"
              onDragOver={onDragOver}
              onDrop={onDrop(item.href)}
            >
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  onDragStart(item.href);
                  e.dataTransfer.setData("text/plain", item.href);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={onDragEnd}
                className="flex w-8 shrink-0 cursor-grab items-center justify-center border-0 bg-transparent py-2 text-[var(--sidebar-text)] opacity-55 transition-opacity hover:opacity-100 active:cursor-grabbing shell-short:w-7 shell-short:py-1.5"
                title="Перетащите, чтобы изменить порядок в меню"
                aria-label={`Изменить порядок: ${item.label}`}
              >
                <DragHandleIcon />
              </button>
              <Link prefetch={false}
                href={item.href}
                draggable={false}
                className={
                  active
                    ? "relative flex min-w-0 flex-1 items-center justify-center px-2 py-2.5 text-center text-sm font-semibold text-[var(--sidebar-text-strong)] shell-short:py-2 shell-short:text-xs"
                    : "relative flex min-w-0 flex-1 items-center justify-center px-2 py-2.5 text-center text-sm font-normal text-[var(--sidebar-text)] transition-colors hover:text-[var(--sidebar-text-strong)] shell-short:py-2 shell-short:text-xs"
                }
                aria-current={active ? "page" : undefined}
              >
                <span className="relative inline-block">
                  {active ? (
                    <span className="nav-marker-layer" aria-hidden />
                  ) : null}
                  <span className="nav-marker-text">{item.label}</span>
                </span>
                {item.href === "/mail" && mailUnreadCount > 0 ? (
                  <span
                    className="pointer-events-none absolute right-0 top-1/2 inline-flex min-h-5 min-w-[1.75rem] -translate-y-1/2 items-center justify-center rounded-full bg-[var(--sidebar-blue)] px-2 tabular-nums text-xs font-semibold text-white shadow-sm"
                    aria-label={`Непрочитанных писем: ${mailUnreadCount}`}
                  >
                    {mailUnreadCount > 99 ? "99+" : mailUnreadCount}
                  </span>
                ) : item.href === "/clickmig" && clickMigPendingCount > 0 ? (
                  <span
                    className="pointer-events-none absolute right-0 top-1/2 inline-flex min-h-5 min-w-[1.75rem] -translate-y-1/2 items-center justify-center rounded-full bg-[var(--sidebar-blue)] px-2 tabular-nums text-xs font-semibold text-white shadow-sm"
                    aria-label={`Новых заявок КликМиг: ${clickMigPendingCount}`}
                  >
                    {clickMigPendingCount > 99 ? "99+" : clickMigPendingCount}
                  </span>
                ) : (
                  <span
                    className="pointer-events-none absolute right-0 top-1/2 inline-flex min-h-5 w-[1.75rem] -translate-y-1/2 items-center justify-center tabular-nums text-xs font-semibold text-[var(--sidebar-text)]"
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
