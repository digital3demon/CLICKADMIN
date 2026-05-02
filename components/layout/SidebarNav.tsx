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
import { readClientState, writeClientState } from "@/lib/client-state-client";

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/orders") {
    return (
      pathname === "/orders" ||
      (pathname.startsWith("/orders/") &&
        !pathname.startsWith("/orders/history"))
    );
  }
  if (href === "/analytics") {
    return pathname === "/analytics" || pathname.startsWith("/analytics/");
  }
  if (href === "/shipments") {
    return pathname === "/shipments" || pathname.startsWith("/shipments/");
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
  { href: "/shipments", label: "Отгрузки", module: "SHIPMENTS" },
  { href: "/warehouse", label: "Склад", module: "WAREHOUSE" },
  { href: "/clients", label: "Клиенты", module: "CLIENTS" },
  { href: "/directory", label: "Конфигурация", module: "DIRECTORY" },
];

const DEFAULT_HREF_ORDER = baseNavItems.map((i) => i.href);

const SIDEBAR_NAV_ORDER_KEY = "sidebarNavOrderV1";

function coalesceOrderForVisible(
  saved: string[],
  allowedHrefs: Set<string>,
): string[] {
  const out: string[] = [];
  for (const h of saved) {
    if (allowedHrefs.has(h) && !out.includes(h)) out.push(h);
  }
  for (const h of DEFAULT_HREF_ORDER) {
    if (allowedHrefs.has(h) && !out.includes(h)) out.push(h);
  }
  return out;
}

function moveHref(list: string[], fromHref: string, toHref: string): string[] {
  const from = list.indexOf(fromHref);
  const to = list.indexOf(toHref);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function DragHandleIcon() {
  return (
    <span
      className="flex flex-col gap-[3px] py-1"
      aria-hidden
    >
      <span className="block h-px w-3.5 rounded-full bg-current opacity-50" />
      <span className="block h-px w-3.5 rounded-full bg-current opacity-50" />
      <span className="block h-px w-3.5 rounded-full bg-current opacity-50" />
    </span>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean> | null>(null);
  const [orderHrefs, setOrderHrefs] = useState<string[]>(DEFAULT_HREF_ORDER);
  const dragHrefRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const j = (await res.json()) as {
          user?: {
            role?: UserRole;
            moduleAccess?: Record<string, boolean> | null;
          } | null;
        };
        if (!cancelled) {
          setRole(j.user?.role ?? null);
          setModuleAccess(
            (j.user?.moduleAccess as Record<string, boolean> | null | undefined) ?? null,
          );
        }
      } catch {
        if (!cancelled) setRole(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = useMemo(() => {
    if (role == null) {
      return baseNavItems;
    }
    if (moduleAccess) {
      const a = moduleAccess as Record<AppModule, boolean>;
      if (isKanbanOnlyUser(role, a)) {
        return baseNavItems.filter((i) => i.href === "/kanban");
      }
      return baseNavItems.filter((i) => {
        if (i.href === "/directory") {
          return hasDirectorySidebarAccess(a);
        }
        return a[i.module] === true;
      });
    }
    if (isKanbanOnlyUser(role)) {
      return baseNavItems.filter((i) => i.href === "/kanban");
    }
    if (!canAccessFinancialAnalytics(role)) {
      return baseNavItems.filter((i) => i.href !== "/analytics");
    }
    return [...baseNavItems];
  }, [role, moduleAccess]);

  useEffect(() => {
    const allowed = new Set(navItems.map((i) => i.href));
    let cancelled = false;
    void (async () => {
      const raw = await readClientState<unknown>("user", SIDEBAR_NAV_ORDER_KEY);
      if (cancelled) return;
      if (Array.isArray(raw) && raw.every((x) => typeof x === "string")) {
        setOrderHrefs(coalesceOrderForVisible(raw as string[], allowed));
        return;
      }
      setOrderHrefs((prev) => coalesceOrderForVisible(prev, allowed));
    })();
    return () => {
      cancelled = true;
    };
  }, [navItems]);

  const orderedNav = useMemo(() => {
    const by = new Map<string, (typeof navItems)[number]>(
      navItems.map((i) => [i.href, i]),
    );
    const hrefs = coalesceOrderForVisible(
      orderHrefs,
      new Set(navItems.map((i) => i.href)),
    );
    return hrefs
      .map((h) => by.get(h))
      .filter((x): x is (typeof navItems)[number] => x != null);
  }, [navItems, orderHrefs]);

  const persistOrder = useCallback((next: string[]) => {
    setOrderHrefs(next);
    void writeClientState("user", SIDEBAR_NAV_ORDER_KEY, next);
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
      const base = coalesceOrderForVisible(orderHrefs, allowed);
      const next = moveHref(base, from, targetHref);
      persistOrder(next);
    },
    [navItems, orderHrefs, persistOrder],
  );

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-3 pt-5 shell-short:px-4 shell-short:pb-2 shell-short:pt-3"
      aria-label="Разделы"
    >
      <p className="sr-only">
        Порядок пунктов меню можно изменить: перетащите ручку слева от названия раздела.
      </p>
      <ul className="flex flex-col gap-0">
        {orderedNav.map((item) => {
          const active = isNavActive(pathname, item.href);
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
                className="flex w-9 shrink-0 cursor-grab items-center justify-center border-0 bg-transparent py-3 text-[var(--sidebar-text)] opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing shell-short:w-7 shell-short:py-2"
                title="Перетащите, чтобы изменить порядок в меню"
                aria-label={`Изменить порядок: ${item.label}`}
              >
                <DragHandleIcon />
              </button>
              <Link
                href={item.href}
                draggable={false}
                className={
                  active
                    ? "relative flex min-w-0 flex-1 items-center justify-center py-3.5 pr-2 text-center text-sm font-semibold text-[var(--sidebar-text-strong)] shell-short:py-2.5 shell-short:text-xs"
                    : "relative flex min-w-0 flex-1 items-center justify-center py-3.5 pr-2 text-center text-sm font-normal text-[var(--sidebar-text)] transition-colors hover:text-[var(--sidebar-text-strong)] shell-short:py-2.5 shell-short:text-xs"
                }
                aria-current={active ? "page" : undefined}
              >
                <span className="relative inline-block">
                  {active ? (
                    <span className="nav-marker-layer" aria-hidden />
                  ) : null}
                  <span className="nav-marker-text">{item.label}</span>
                </span>
                <span
                  className="pointer-events-none absolute right-0 top-1/2 inline-flex min-h-5 w-[1.75rem] -translate-y-1/2 items-center justify-center tabular-nums text-xs font-semibold text-[var(--sidebar-text)]"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
