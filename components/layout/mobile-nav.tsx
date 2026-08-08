"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fontDisplay } from "@/lib/app-fonts";

type MobileNavContextValue = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
  /** Страница использует заголовок как кнопку меню — скрыть floating hamburger. */
  claimTitleAsMenu: () => () => void;
  titleAsMenu: boolean;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({
  children,
  open,
  setOpen,
}: {
  children: ReactNode;
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const [titleAsMenuCount, setTitleAsMenuCount] = useState(0);

  const closeMobileNav = useCallback(() => setOpen(false), [setOpen]);
  const toggleMobileNav = useCallback(() => setOpen((v) => !v), [setOpen]);

  const claimTitleAsMenu = useCallback(() => {
    setTitleAsMenuCount((n) => n + 1);
    return () => setTitleAsMenuCount((n) => Math.max(0, n - 1));
  }, []);

  const value = useMemo(
    () => ({
      mobileNavOpen: open,
      setMobileNavOpen: setOpen,
      toggleMobileNav,
      closeMobileNav,
      claimTitleAsMenu,
      titleAsMenu: titleAsMenuCount > 0,
    }),
    [
      open,
      setOpen,
      toggleMobileNav,
      closeMobileNav,
      claimTitleAsMenu,
      titleAsMenuCount,
    ],
  );

  return (
    <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>
  );
}

export function useMobileNav(): MobileNavContextValue {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used within MobileNavProvider");
  }
  return ctx;
}

export function useMobileNavOptional(): MobileNavContextValue | null {
  return useContext(MobileNavContext);
}

/**
 * Заголовок модуля на mobile: открывает боковое меню (вместо overlapping hamburger).
 * На shell-desktop — обычный h1.
 */
export function PageTitleAsMenuButton({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  const nav = useMobileNavOptional();

  useEffect(() => {
    if (!nav) return;
    return nav.claimTitleAsMenu();
  }, [nav]);

  const headingClass =
    `${fontDisplay.className} text-xl font-semibold tracking-tight text-[var(--app-text)] lg:text-2xl ${className}`.trim();

  if (!nav) {
    return <h1 className={headingClass}>{title}</h1>;
  }

  return (
    <>
      <button
        type="button"
        className={`shell-desktop:hidden ${headingClass} border-0 bg-transparent p-0 text-left`}
        aria-expanded={nav.mobileNavOpen}
        aria-controls="app-primary-nav"
        aria-label={
          nav.mobileNavOpen
            ? `${title}: закрыть меню`
            : `${title}: открыть меню`
        }
        onClick={() => nav.toggleMobileNav()}
      >
        {title}
      </button>
      <h1 className={`hidden shell-desktop:block ${headingClass}`}>{title}</h1>
    </>
  );
}
