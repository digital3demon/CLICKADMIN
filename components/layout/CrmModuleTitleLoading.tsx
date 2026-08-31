"use client";

import { fontDisplay } from "@/lib/app-fonts";

export function CrmModuleTitleLoading({
  title,
  hint = "Загрузка списка…",
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="px-3 pt-6 sm:px-6 sm:pt-8" aria-busy="true" aria-live="polite">
      <h1
        className={`${fontDisplay.className} break-words text-xl font-semibold tracking-tight text-[var(--app-text)] lg:text-2xl`}
      >
        {title}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}
