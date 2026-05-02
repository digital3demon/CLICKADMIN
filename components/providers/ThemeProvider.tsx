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
import {
  isThemePreference,
  type ThemePreference,
} from "@/lib/theme-storage";
import { readClientState, writeClientState } from "@/lib/client-state-client";

type ThemeContextValue = {
  theme: ThemePreference;
  /** Текущий фактический режим отображения (учитывает «как в системе»). */
  resolvedDark: boolean;
  setTheme: (t: ThemePreference) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function computeDark(pref: ThemePreference): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return systemPrefersDark();
}

function applyDom(pref: ThemePreference) {
  document.documentElement.classList.toggle("dark", computeDark(pref));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedDark, setResolvedDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await readClientState<unknown>("user", "themePreference");
      if (cancelled) return;
      const next = isThemePreference(typeof raw === "string" ? raw : null)
        ? (raw as ThemePreference)
        : "system";
      setThemeState(next);
      const dark = computeDark(next);
      setResolvedDark(dark);
      document.documentElement.classList.toggle("dark", dark);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void writeClientState("user", "themePreference", theme);
    const dark = computeDark(theme);
    setResolvedDark(dark);
    applyDom(theme);
  }, [theme, ready]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const dark = computeDark("system");
      setResolvedDark(dark);
      document.documentElement.classList.toggle("dark", dark);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", computeDark(t));
  }, []);

  /** Только светлая ↔ тёмная (без режима «как в системе»). */
  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const darkNow = computeDark(prev);
      const next: ThemePreference = darkNow ? "light" : "dark";
      document.documentElement.classList.toggle("dark", computeDark(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedDark, setTheme, cycleTheme }),
    [theme, resolvedDark, setTheme, cycleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
