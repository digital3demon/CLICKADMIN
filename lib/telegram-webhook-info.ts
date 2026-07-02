export type TelegramWebhookInfo = {
  ok: true;
  url: string;
  pendingUpdateCount: number;
  lastErrorMessage: string | null;
  lastErrorDate: number | null;
  ipAddress: string | null;
  maxConnections: number | null;
};

export type TelegramBotMe = {
  ok: true;
  id: string;
  username: string | null;
  canReadAllGroupMessages: boolean;
};

async function telegramApiJson<T>(
  botToken: string,
  method: string,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/${method}`,
    );
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      result?: T;
    };
    if (!res.ok || j.ok !== true) {
      return { ok: false, error: j.description?.trim() || `HTTP ${res.status}` };
    }
    return { ok: true, result: j.result as T };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Сеть до api.telegram.org",
    };
  }
}

export async function fetchTelegramWebhookInfo(
  botToken: string,
): Promise<TelegramWebhookInfo | { ok: false; error: string }> {
  const r = await telegramApiJson<{
    url?: string;
    pending_update_count?: number;
    last_error_message?: string;
    last_error_date?: number;
    ip_address?: string;
    max_connections?: number;
  }>(botToken, "getWebhookInfo");
  if (!r.ok) return r;
  const w = r.result;
  return {
    ok: true,
    url: w.url?.trim() || "",
    pendingUpdateCount: Number(w.pending_update_count ?? 0),
    lastErrorMessage: w.last_error_message?.trim() || null,
    lastErrorDate:
      w.last_error_date != null && Number.isFinite(w.last_error_date)
        ? Math.trunc(w.last_error_date)
        : null,
    ipAddress: w.ip_address?.trim() || null,
    maxConnections:
      w.max_connections != null && Number.isFinite(w.max_connections)
        ? Math.trunc(w.max_connections)
        : null,
  };
}

export async function fetchTelegramBotMe(
  botToken: string,
): Promise<TelegramBotMe | { ok: false; error: string }> {
  const r = await telegramApiJson<{
    id?: number;
    username?: string;
    can_read_all_group_messages?: boolean;
  }>(botToken, "getMe");
  if (!r.ok) return r;
  const me = r.result;
  if (me.id == null || !Number.isFinite(me.id)) {
    return { ok: false, error: "getMe: нет id" };
  }
  return {
    ok: true,
    id: String(Math.trunc(me.id)),
    username: me.username?.trim() || null,
    canReadAllGroupMessages: me.can_read_all_group_messages === true,
  };
}
