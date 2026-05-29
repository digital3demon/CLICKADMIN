"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  computeResolvedDark,
  isThemePreference,
  readThemePreferenceFromLocalStorage,
  type ThemePreference,
  writeThemePreferenceToLocalStorage,
} from "@/lib/theme-storage";
import { getClientThemeInitialState } from "@/lib/theme-initial-state";
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

function applyDom(pref: ThemePreference) {
  document.documentElement.classList.toggle(
    "dark",
    computeResolvedDark(pref, systemPrefersDark()),
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedDark, setResolvedDark] = useState(false);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const init = getClientThemeInitialState();
    setThemeState(init.theme);
    setResolvedDark(init.resolvedDark);
    document.documentElement.classList.toggle("dark", init.resolvedDark);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await readClientState<unknown>("user", "themePreference");
        if (cancelled) return;
        if (typeof raw === "string" && isThemePreference(raw)) {
          const local = readThemePreferenceFromLocalStorage();
          const localExplicit =
            local === "dark" || local === "light" ? local : null;
          /*
           * Явный выбор на этом устройстве (localStorage) не затираем устаревшим значением из БД:
           * иначе после F5 снова светлая тема, если PUT в userClientState не дошёл или в БД «light» по умолчанию.
           */
          const effective =
            localExplicit && localExplicit !== raw ? localExplicit : raw;
          setThemeState(effective);
          writeThemePreferenceToLocalStorage(effective);
          const dark = computeResolvedDark(effective, systemPrefersDark());
          setResolvedDark(dark);
          document.documentElement.classList.toggle("dark", dark);
          if (localExplicit && localExplicit !== raw) {
            void writeClientState("user", "themePreference", localExplicit);
          }
        }
      } catch {
        /* сеть / 401 — оставляем тему из localStorage, не сбрасываем на system */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void writeClientState("user", "themePreference", theme);
    writeThemePreferenceToLocalStorage(theme);
    const dark = computeResolvedDark(theme, systemPrefersDark());
    setResolvedDark(dark);
    applyDom(theme);
  }, [theme, ready]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const dark = computeResolvedDark("system", mq.matches);
      setResolvedDark(dark);
      document.documentElement.classList.toggle("dark", dark);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    writeThemePreferenceToLocalStorage(t);
    document.documentElement.classList.toggle(
      "dark",
      computeResolvedDark(t, systemPrefersDark()),
    );
  }, []);

  /** Только светлая ↔ тёмная (без режима «как в системе»). */
  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const darkNow = computeResolvedDark(prev, systemPrefersDark());
      const next: ThemePreference = darkNow ? "light" : "dark";
      writeThemePreferenceToLocalStorage(next);
      document.documentElement.classList.toggle(
        "dark",
        computeResolvedDark(next, systemPrefersDark()),
      );
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
