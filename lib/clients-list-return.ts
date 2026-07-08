export const CLIENTS_LIST_RETURN_KEY = "crm:clients-list-return";

export function saveClientsListReturnUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CLIENTS_LIST_RETURN_KEY, url);
  } catch {
    /* private mode / quota */
  }
}

export function readClientsListReturnUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(CLIENTS_LIST_RETURN_KEY);
  } catch {
    return null;
  }
}

function isSafeClientsReturnPath(path: string): boolean {
  const v = path.trim();
  return v.startsWith("/clients") && !v.startsWith("//");
}

/** URL «назад к списку»: query returnTo или sessionStorage после клика из списка. */
export function resolveClientsBackHref(
  returnToFromQuery: string | undefined,
  fallback = "/clients",
): string {
  const fromQuery = returnToFromQuery?.trim();
  if (fromQuery && isSafeClientsReturnPath(fromQuery)) return fromQuery;
  const stored = readClientsListReturnUrl();
  if (stored && isSafeClientsReturnPath(stored)) return stored;
  return fallback;
}
