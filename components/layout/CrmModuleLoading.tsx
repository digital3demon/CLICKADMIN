/** Мгновенный скелетон сегмента, пока RSC модуля ещё считается. */

export function CrmModuleLoading() {
  return (
    <div className="px-3 pt-6 sm:px-6 sm:pt-8" aria-busy="true" aria-live="polite">
      <div className="h-7 w-48 max-w-full rounded-md bg-[var(--surface-subtle)]" />
      <div className="mt-3 h-4 w-80 max-w-full rounded-md bg-[var(--surface-subtle)]" />
      <div className="mt-6 space-y-2">
        <div className="h-12 rounded-lg bg-[var(--surface-subtle)]" />
        <div className="h-12 rounded-lg bg-[var(--surface-subtle)]" />
        <div className="h-12 rounded-lg bg-[var(--surface-subtle)]" />
        <div className="h-12 rounded-lg bg-[var(--surface-subtle)]" />
        <div className="h-12 rounded-lg bg-[var(--surface-subtle)]" />
        <div className="h-12 rounded-lg bg-[var(--surface-subtle)]" />
        <div className="h-12 rounded-lg bg-[var(--surface-subtle)]" />
        <div className="h-12 rounded-lg bg-[var(--surface-subtle)]" />
      </div>
      <span className="sr-only">Загрузка модуля…</span>
    </div>
  );
}
