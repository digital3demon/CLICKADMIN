/**
 * Живой список модуля доложил «я на экране».
 * Keep-alive не затирает кэш loading.tsx: серверный Loading теряет флаги во Flight.
 */

let paintedPath: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function markCrmListAlive(path: string | null): void {
  const next = path && path.startsWith("/") ? path : null;
  if (paintedPath === next) return;
  paintedPath = next;
  emit();
}

export function getCrmListAlivePath(): string | null {
  return paintedPath;
}

export function subscribeCrmListAlive(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
