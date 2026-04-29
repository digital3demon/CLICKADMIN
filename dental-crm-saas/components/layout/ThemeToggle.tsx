"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

/** Кнопка без подписи: переключение светлой и тёмной темы. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedDark, cycleTheme } = useTheme();

  const label = resolvedDark
    ? "Сейчас тёмная тема. Нажмите для светлой."
    : "Сейчас светлая тема. Нажмите для тёмной.";

  const box = compact
    ? "h-8 w-8"
    : "h-9 w-9 shell-short:h-8 shell-short:w-8";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={label}
      aria-label={label}
      className={`flex shrink-0 items-center justify-center rounded-md border border-zinc-300/90 bg-zinc-100 text-zinc-800 shadow-sm transition-colors hover:bg-zinc-200 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:shadow-none ${box}`}
    >
      {resolvedDark ? <IconMoon size={compact ? 14 : 16} /> : <IconSun size={compact ? 14 : 16} />}
    </button>
  );
}

function IconSun({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 14.5A8.5 8.5 0 0110.5 4a8.45 8.45 0 013.32.67 7 7 0 100 14.66A8.5 8.5 0 0021 14.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
