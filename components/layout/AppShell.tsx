"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OrderCorrectionToastStack } from "@/components/orders/OrderCorrectionToastStack";
import { Sidebar } from "./Sidebar";

const SIDEBAR_W = "calc(100% / 7)";

function MenuToggleIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type AppShellProps = {
  children: ReactNode;
};

/**
 * Десктоп (shell-desktop = ширина ≥1024px и высота ≥560px): колонка меню 1/7, контент 6/7.
 * Иначе — выезжающее меню и «гамбургер», как на телефоне (узкое окно или низкая высота).
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLogin = pathname === "/login" || pathname.startsWith("/login/");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileNav();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen, closeMobileNav]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileNavOpen) {
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [mobileNavOpen]);

  if (isLogin) {
    return (
      <div className="min-h-screen w-full bg-[var(--app-bg)]">{children}</div>
    );
  }

  return (
    <div
      className="min-h-screen w-full"
      style={
        {
          "--app-sidebar-w": SIDEBAR_W,
        } as CSSProperties
      }
    >
      <button
        type="button"
        className="fixed z-[80] flex h-11 w-11 items-center justify-center rounded-md border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text-strong)] shadow-md shell-desktop:hidden"
        style={{
          top: "max(0.75rem, env(safe-area-inset-top, 0px))",
          left: "max(0.75rem, env(safe-area-inset-left, 0px))",
        }}
        aria-expanded={mobileNavOpen}
        aria-controls="app-primary-nav"
        aria-label={mobileNavOpen ? "Закрыть меню" : "Открыть меню"}
        onClick={() => setMobileNavOpen((o) => !o)}
      >
        <MenuToggleIcon open={mobileNavOpen} />
      </button>

      <main
        className={[
          "relative z-0 ml-0 min-h-[100dvh] w-full min-w-0 max-w-full overflow-x-hidden bg-[var(--app-bg)] pt-[env(safe-area-inset-top,0px)] pe-[env(safe-area-inset-right,0px)] transition-[margin-left,width,padding,opacity] duration-200 ease-out shell-desktop:z-auto shell-desktop:ml-[calc(100%/7)] shell-desktop:w-[calc(100%*6/7)] shell-desktop:max-w-none shell-desktop:ps-0 shell-desktop:pe-0 shell-desktop:pt-0",
          mobileNavOpen
            ? "max-lg:pointer-events-none max-lg:select-none max-lg:opacity-40 [@media(min-width:1024px)_and_(max-height:559px)]:pointer-events-none [@media(min-width:1024px)_and_(max-height:559px)]:select-none [@media(min-width:1024px)_and_(max-height:559px)]:opacity-40"
            : "",
        ].join(" ")}
        aria-hidden={mobileNavOpen ? true : undefined}
      >
        {children}
      </main>

      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 shell-desktop:hidden ${
          mobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
        onClick={closeMobileNav}
      />

      <aside
        id="app-primary-nav"
        className={`fixed left-0 top-0 z-[70] flex h-[100dvh] min-w-0 flex-col overflow-x-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shadow-[4px_0_24px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out dark:shadow-[4px_0_28px_rgba(0,0,0,0.45)] shell-desktop:translate-x-0 shell-desktop:shadow-none ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full shell-desktop:translate-x-0"
        } w-[min(20rem,calc(100vw-2.5rem))] shell-desktop:w-[calc(100%/7)]`}
        aria-label="Основное меню"
      >
        <Sidebar />
      </aside>

      <OrderCorrectionToastStack />
    </div>
  );
}
