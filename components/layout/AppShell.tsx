"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OrderCorrectionToastStack } from "@/components/orders/OrderCorrectionToastStack";
import { OrderBackgroundUploadToast } from "@/components/orders/OrderBackgroundUploadToast";
import { isPublicStickerHubPath } from "@/lib/sticker-public-path";
import { isClickMigPublicSurfacePath } from "@/lib/clickmig/form-host";
import { MobileNavProvider, useMobileNav } from "@/components/layout/mobile-nav";
import {
  DesktopSidebarCollapseProvider,
  useDesktopSidebarCollapse,
} from "@/components/layout/desktop-sidebar-collapse";
import { APP_SIDEBAR_W_COLLAPSED } from "@/lib/app-sidebar-collapse";
import { APP_SIDEBAR_W_EXPANDED } from "@/lib/crm-layout-tiers";
import { Sidebar } from "./Sidebar";

/** Слева от липких полос на mobile: кнопка меню (0.75rem + 2.75rem) + небольшой зазор. */
const MOBILE_MENU_INSET =
  "calc(max(0.75rem, env(safe-area-inset-left, 0px)) + 2.75rem + 0.375rem)";

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

function AppShellChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    mobileNavOpen,
    setMobileNavOpen,
    closeMobileNav,
    titleAsMenu,
  } = useMobileNav();
  const { collapsed, toggleCollapsed } = useDesktopSidebarCollapse();

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

  const sidebarW = collapsed ? APP_SIDEBAR_W_COLLAPSED : APP_SIDEBAR_W_EXPANDED;
  const permanentRail = collapsed;

  return (
    <div
      className="min-h-screen w-full"
      data-sidebar-collapsed={collapsed ? "1" : "0"}
      style={
        {
          "--app-sidebar-w": sidebarW,
          "--app-mobile-menu-inset": MOBILE_MENU_INSET,
        } as CSSProperties
      }
    >
      {!permanentRail && (!titleAsMenu || mobileNavOpen) ? (
        <button
          type="button"
          className="fixed z-[80] flex h-11 w-11 items-center justify-center rounded-md border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text-strong)] shadow-md shell-laptop:hidden"
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
      ) : null}

      <main
        className={[
          "relative z-0 min-h-[100dvh] min-w-0 max-w-full overflow-x-clip bg-[var(--app-bg)] pt-[env(safe-area-inset-top,0px)] pe-[env(safe-area-inset-right,0px)] transition-[margin-left,width,padding,opacity] duration-200 ease-out @container/crm-shell custom-scrollbar",
          permanentRail
            ? "ml-[var(--app-sidebar-w)] w-[calc(100%-var(--app-sidebar-w))] ps-0 pe-[env(safe-area-inset-right,0px)] pt-[env(safe-area-inset-top,0px)]"
            : "ml-0 w-full shell-laptop:z-auto shell-laptop:ml-[var(--app-sidebar-w)] shell-laptop:w-[calc(100%-var(--app-sidebar-w))] shell-laptop:max-w-none shell-laptop:ps-0 shell-laptop:pe-0 shell-laptop:pt-0",
          !permanentRail && mobileNavOpen
            ? "max-[1023px]:pointer-events-none max-[1023px]:select-none max-[1023px]:opacity-40 [@media(min-width:1024px)_and_(max-height:559px)]:pointer-events-none [@media(min-width:1024px)_and_(max-height:559px)]:select-none [@media(min-width:1024px)_and_(max-height:559px)]:opacity-40"
            : "",
        ].join(" ")}
        aria-hidden={mobileNavOpen ? true : undefined}
      >
        {children}
      </main>

      {!permanentRail ? (
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 shell-laptop:hidden ${
          mobileNavOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden
        onClick={closeMobileNav}
      />
      ) : null}

      <aside
        id="app-primary-nav"
        className={`fixed left-0 top-0 z-[70] flex h-[100dvh] min-w-0 flex-col overflow-visible border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shadow-[4px_0_24px_rgba(0,0,0,0.12)] transition-[transform,width] duration-200 ease-out dark:shadow-[4px_0_28px_rgba(0,0,0,0.45)] shell-laptop:shadow-none ${
          permanentRail
            ? "w-[var(--app-sidebar-w)] translate-x-0"
            : mobileNavOpen
              ? "w-[min(20rem,calc(100vw-2.5rem))] translate-x-0"
              : "-translate-x-full shell-laptop:w-[var(--app-sidebar-w)] shell-laptop:translate-x-0"
        }`}
        aria-label="Основное меню"
      >
        <Sidebar />
        <button
          type="button"
          className={`absolute left-full top-8 z-[80] h-11 w-3.5 -translate-x-px items-center justify-center rounded-r-md border border-l-0 border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] shadow-[2px_1px_6px_rgba(0,0,0,0.18)] hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-text-strong)] ${
            permanentRail ? "flex" : "hidden shell-laptop:flex"
          }`}
          aria-expanded={!collapsed}
          aria-controls="app-primary-nav"
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          onClick={toggleCollapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      </aside>

      <OrderCorrectionToastStack />
      <OrderBackgroundUploadToast />
    </div>
  );
}

type AppShellProps = {
  children: ReactNode;
};

/**
 * Laptop+ (shell-laptop): колонка меню, контент рядом; рельс можно включить на любом размере.
 * Уже окно (<1024px) или низкая высота — drawer; явное «свернуть» даёт постоянный рельс и на телефоне.
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLogin = pathname === "/login" || pathname.startsWith("/login/");
  const isTgApp = pathname === "/tg-app" || pathname?.startsWith("/tg-app/");
  const isPublicSticker = isPublicStickerHubPath(pathname ?? "");
  const isClickMigPublic = isClickMigPublicSurfacePath(pathname ?? "");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (isLogin || isTgApp || isPublicSticker || isClickMigPublic) {
    return (
      <div className="min-h-screen w-full bg-[var(--app-bg)]">{children}</div>
    );
  }

  return (
    <MobileNavProvider open={mobileNavOpen} setOpen={setMobileNavOpen}>
      <DesktopSidebarCollapseProvider>
        <AppShellChrome>{children}</AppShellChrome>
      </DesktopSidebarCollapseProvider>
    </MobileNavProvider>
  );
}
