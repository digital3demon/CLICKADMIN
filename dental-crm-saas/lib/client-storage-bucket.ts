/**
 * Раздельное клиентское хранилище для «боевая сессия» vs «демо» (черновики наряда, шаблон плашек).
 * sessionStorage — по вкладке, не затирается другой вкладкой с другим режимом.
 */
const SESSION_KEY = "crm_storage_bucket_v1";

export type ClientStorageBucket = "live" | "demo";

export function readClientStorageBucket(): ClientStorageBucket {
  if (typeof window === "undefined") return "live";
  const v = window.sessionStorage.getItem(SESSION_KEY);
  return v === "demo" ? "demo" : "live";
}

export function writeClientStorageBucket(next: ClientStorageBucket): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, next);
}
