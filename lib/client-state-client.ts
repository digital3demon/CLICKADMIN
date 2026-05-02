export type ClientStateScope = "user" | "tenant";

type GetResponse = { found: boolean; value: unknown };

export async function readClientState<T>(
  scope: ClientStateScope,
  key: string,
): Promise<T | null> {
  try {
    const q = new URLSearchParams({ scope, key });
    const res = await fetch(`/api/client-state?${q.toString()}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as GetResponse;
    return j.found ? (j.value as T) : null;
  } catch {
    return null;
  }
}

export async function writeClientState(
  scope: ClientStateScope,
  key: string,
  value: unknown,
): Promise<boolean> {
  try {
    const res = await fetch("/api/client-state", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, key, value }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteClientState(
  scope: ClientStateScope,
  key: string,
): Promise<boolean> {
  return writeClientState(scope, key, null);
}
