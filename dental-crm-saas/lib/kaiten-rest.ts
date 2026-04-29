import { getKaitenEnvConfig, type KaitenBoardTarget } from "@/lib/kaiten-config";
import type { KaitenTrackLane } from "@prisma/client";

export type KaitenAuth = { apiBase: string; token: string };

/** Опции HTTP к Kaiten. */
export type KaitenHttpOpts = {
  /**
   * Без паузы в глобальной очереди между запросами — для короткой цепочки из одного
   * действия пользователя (напр. блок/разблок из облака тегов). Снижает суммарное время
   * с секунд до сетевой задержки; для фоновой синхронизации не использовать.
   */
  burst?: boolean;
};

export function getKaitenRestAuth(): KaitenAuth | null {
  const token = process.env.KAITEN_API_TOKEN?.trim();
  if (!token) return null;
  const fromCfg = getKaitenEnvConfig();
  const base =
    fromCfg?.apiBase ??
    (process.env.KAITEN_API_BASE_URL?.trim() ||
      "https://clicklab.kaiten.ru/api/v1");
  return { apiBase: base.replace(/\/+$/, ""), token };
}

function spacingMs(): number {
  const raw = process.env.KAITEN_REQUEST_SPACING_MS;
  const n = raw != null && raw.trim() ? Number.parseInt(raw.trim(), 10) : 90;
  if (!Number.isFinite(n) || n < 0) return 90;
  return Math.min(n, 2000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Очередь + пауза между запросами — меньше всплесков и 429 от Kaiten. */
let kaitenRequestTail: Promise<unknown> = Promise.resolve();

function withKaitenSpacing<T>(fn: () => Promise<T>): Promise<T> {
  const gap = spacingMs();
  const run = kaitenRequestTail.catch(() => undefined).then(() => fn());
  kaitenRequestTail = run.finally(() => sleep(gap));
  return run;
}

function retryAfterFromHeader(h: string | null): number | null {
  if (h == null || !h.trim()) return null;
  const t = h.trim();
  const sec = Number.parseInt(t, 10);
  if (Number.isFinite(sec) && sec >= 0) return Math.min(sec * 1000, 120_000);
  const when = Date.parse(t);
  if (Number.isFinite(when)) {
    const d = when - Date.now();
    return d > 0 ? Math.min(d, 120_000) : 800;
  }
  return null;
}

async function kaitenFetchOnce(
  auth: KaitenAuth,
  path: string,
  init?: RequestInit,
): Promise<{
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
  retryAfterMs: number | null;
}> {
  const url = `${auth.apiBase.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const retryAfterMs = retryAfterFromHeader(res.headers.get("retry-after"));
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text, retryAfterMs };
}

async function kaitenFetch(
  auth: KaitenAuth,
  path: string,
  init?: RequestInit,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const max = 3;
  let last: { ok: boolean; status: number; json: unknown; text: string } | null = null;
  for (let attempt = 0; attempt < max; attempt++) {
    const r =
      opts?.burst === true
        ? await kaitenFetchOnce(auth, path, init)
        : await withKaitenSpacing(() => kaitenFetchOnce(auth, path, init));
    last = { ok: r.ok, status: r.status, json: r.json, text: r.text };
    if (r.status !== 429) return last;
    if (attempt === max - 1) return last;
    const wait =
      r.retryAfterMs ?? Math.min(10_000, Math.round(700 * (attempt + 1) ** 2));
    await sleep(wait);
  }
  return last!;
}

export async function kaitenGetCard(
  auth: KaitenAuth,
  cardId: number,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; status: number; card: Record<string, unknown> | null; error: string | null }> {
  const r = await kaitenFetch(auth, `/cards/${cardId}`, { method: "GET" }, opts);
  if (!r.ok || r.json == null || typeof r.json !== "object") {
    return {
      ok: false,
      status: r.status,
      card: null,
      error: typeof r.text === "string" ? r.text.slice(0, 800) : "Kaiten error",
    };
  }
  return { ok: true, status: r.status, card: r.json as Record<string, unknown>, error: null };
}

export async function kaitenPatchCard(
  auth: KaitenAuth,
  cardId: number,
  body: Record<string, unknown>,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; status: number; card: Record<string, unknown> | null; error: string | null }> {
  const r = await kaitenFetch(
    auth,
    `/cards/${cardId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    opts,
  );
  if (!r.ok || r.json == null || typeof r.json !== "object") {
    return {
      ok: false,
      status: r.status,
      card: null,
      error: typeof r.text === "string" ? r.text.slice(0, 800) : "Kaiten error",
    };
  }
  return { ok: true, status: r.status, card: r.json as Record<string, unknown>, error: null };
}

/** Удалить карточку в Kaiten. 404 — карточки уже нет, считаем успехом. */
export async function kaitenDeleteCard(
  auth: KaitenAuth,
  cardId: number,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; status: number; error: string | null }> {
  const r = await kaitenFetch(auth, `/cards/${cardId}`, { method: "DELETE" }, opts);
  if (r.status === 404) {
    return { ok: true, status: 404, error: null };
  }
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      error: typeof r.text === "string" ? r.text.slice(0, 800) : "Kaiten error",
    };
  }
  return { ok: true, status: r.status, error: null };
}

function cardBlockerRowsFromListJson(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  if (json != null && typeof json === "object") {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.records)) return o.records as Record<string, unknown>[];
    if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
    if (Array.isArray(o.blockers)) return o.blockers as Record<string, unknown>[];
  }
  return [];
}

/** Список записей блокировок карточки (актуальный API Kaiten). */
export async function kaitenListCardBlockers(
  auth: KaitenAuth,
  cardId: number,
  opts?: KaitenHttpOpts,
): Promise<{
  ok: boolean;
  status: number;
  items: Record<string, unknown>[];
  error: string | null;
}> {
  const r = await kaitenFetch(
    auth,
    `/cards/${cardId}/blockers`,
    { method: "GET" },
    opts,
  );
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      items: [],
      error: typeof r.text === "string" ? r.text.slice(0, 800) : "Kaiten error",
    };
  }
  return {
    ok: true,
    status: r.status,
    items: cardBlockerRowsFromListJson(r.json),
    error: null,
  };
}

/**
 * Заблокировать карточку через POST /cards/{id}/blockers (как UI Kaiten).
 * При отказе API можно fallback на PATCH blocked у карточки.
 */
export async function kaitenPostCardBlocker(
  auth: KaitenAuth,
  cardId: number,
  reason: string,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; status: number; error: string | null }> {
  const bodies: Record<string, unknown>[] = [{ reason }, { block_reason: reason }];
  let lastErr = "Kaiten error";
  for (const b of bodies) {
    const r = await kaitenFetch(
      auth,
      `/cards/${cardId}/blockers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      },
      opts,
    );
    if (r.ok) return { ok: true, status: r.status, error: null };
    lastErr = typeof r.text === "string" ? r.text.slice(0, 800) : lastErr;
  }
  return { ok: false, status: 400, error: lastErr };
}

export async function kaitenDeleteCardBlocker(
  auth: KaitenAuth,
  cardId: number,
  blockerRowId: number,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; status: number; error: string | null }> {
  const r = await kaitenFetch(
    auth,
    `/cards/${cardId}/blockers/${blockerRowId}`,
    { method: "DELETE" },
    opts,
  );
  if (r.ok) return { ok: true, status: r.status, error: null };
  return {
    ok: false,
    status: r.status,
    error: typeof r.text === "string" ? r.text.slice(0, 800) : "Kaiten error",
  };
}

/** DELETE /api/v1/cards/{card_id}/files/{id} — снять файл с карточки. */
export async function kaitenDeleteCardFile(
  auth: KaitenAuth,
  cardId: number,
  fileId: number,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; status: number; error: string | null }> {
  const r = await kaitenFetch(
    auth,
    `/cards/${cardId}/files/${fileId}`,
    {
      method: "DELETE",
    },
    opts,
  );
  if (r.ok) return { ok: true, status: r.status, error: null };
  return {
    ok: false,
    status: r.status,
    error: typeof r.text === "string" ? r.text.slice(0, 800) : "Kaiten error",
  };
}

/** Снимает все не released блокировки с карточки. */
export async function kaitenReleaseActiveCardBlockers(
  auth: KaitenAuth,
  cardId: number,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; error: string | null }> {
  const list = await kaitenListCardBlockers(auth, cardId, opts);
  if (!list.ok) {
    return { ok: false, error: list.error ?? "Не удалось получить блокировки" };
  }
  for (const row of list.items) {
    const id = typeof row.id === "number" ? row.id : null;
    if (id == null) continue;
    if (row.released === true) continue;
    const d = await kaitenDeleteCardBlocker(auth, cardId, id, opts);
    if (!d.ok) {
      return { ok: false, error: d.error ?? "Не удалось снять блокировку" };
    }
  }
  return { ok: true, error: null };
}

/** GET /cards/:id/comments — иногда массив, иногда `{ data: [...] }`. */
function kaitenCommentsArrayFromResponseJson(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (json != null && typeof json === "object" && !Array.isArray(json)) {
    const o = json as Record<string, unknown>;
    for (const k of ["data", "comments", "items", "rows", "result", "records"]) {
      const v = o[k];
      if (Array.isArray(v)) return v;
    }
  }
  return null;
}

export async function kaitenListComments(
  auth: KaitenAuth,
  cardId: number,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; status: number; comments: unknown[]; error: string | null }> {
  const r = await kaitenFetch(
    auth,
    `/cards/${cardId}/comments`,
    { method: "GET" },
    opts,
  );
  const arr = kaitenCommentsArrayFromResponseJson(r.json);
  if (!r.ok || !arr) {
    return {
      ok: false,
      status: r.status,
      comments: [],
      error: typeof r.text === "string" ? r.text.slice(0, 800) : "Kaiten error",
    };
  }
  return { ok: true, status: r.status, comments: arr, error: null };
}

export async function kaitenCreateComment(
  auth: KaitenAuth,
  cardId: number,
  text: string,
  parentCommentId?: number | null,
): Promise<{ ok: boolean; status: number; comment: Record<string, unknown> | null; error: string | null }> {
  const trimmed = text.trim();
  const tryBodies: Record<string, unknown>[] = [];
  if (parentCommentId != null && Number.isFinite(parentCommentId)) {
    tryBodies.push({ text: trimmed, parent_comment_id: parentCommentId });
    tryBodies.push({ text: trimmed, parent_id: parentCommentId });
  }
  tryBodies.push({ text: trimmed });

  let lastErr = "Kaiten error";
  for (const body of tryBodies) {
    const r = await kaitenFetch(auth, `/cards/${cardId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const j = r.json;
      if (j != null && typeof j === "object" && !Array.isArray(j)) {
        return {
          ok: true,
          status: r.status,
          comment: j as Record<string, unknown>,
          error: null,
        };
      }
      // HTTP 2xx без JSON-объекта: не пробуем следующий вариант тела — иначе Kaiten получит второй POST и дубль в чате.
      return {
        ok: false,
        status: r.status,
        comment: null,
        error:
          typeof r.text === "string" && r.text.trim()
            ? r.text.slice(0, 800)
            : "Kaiten: пустой или неожиданный ответ при создании комментария",
      };
    }
    lastErr = typeof r.text === "string" ? r.text.slice(0, 800) : lastErr;
  }
  return {
    ok: false,
    status: 400,
    comment: null,
    error: lastErr,
  };
}

export async function kaitenListBoardColumns(
  auth: KaitenAuth,
  boardId: number,
  opts?: KaitenHttpOpts,
): Promise<{
  ok: boolean;
  status: number;
  columns: Array<{ id: number; title: string; name?: string }>;
  error: string | null;
}> {
  const r = await kaitenFetch(
    auth,
    `/boards/${boardId}/columns`,
    { method: "GET" },
    opts,
  );
  const arr = Array.isArray(r.json) ? r.json : [];
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      columns: [],
      error: typeof r.text === "string" ? r.text.slice(0, 500) : null,
    };
  }
  const columns = arr
    .map((x) => {
      if (x == null || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const id = o.id;
      if (typeof id !== "number") return null;
      const title =
        typeof o.title === "string"
          ? o.title
          : typeof o.name === "string"
            ? o.name
            : "";
      const col: { id: number; title: string; name?: string } = { id, title };
      if (typeof o.name === "string") col.name = o.name;
      return col;
    })
    .filter((x): x is { id: number; title: string; name?: string } => x != null);
  return { ok: true, status: r.status, columns, error: null };
}

export async function kaitenListBoardLanes(
  auth: KaitenAuth,
  boardId: number,
  opts?: KaitenHttpOpts,
): Promise<{
  ok: boolean;
  status: number;
  lanes: Array<{ id: number; title: string }>;
  error: string | null;
}> {
  const r = await kaitenFetch(
    auth,
    `/boards/${boardId}/lanes`,
    { method: "GET" },
    opts,
  );
  const arr = Array.isArray(r.json) ? r.json : [];
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      lanes: [],
      error: typeof r.text === "string" ? r.text.slice(0, 500) : null,
    };
  }
  const lanes = arr
    .map((x) => {
      if (x == null || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const id = o.id;
      if (typeof id !== "number") return null;
      const title = typeof o.title === "string" ? o.title : "";
      return { id, title };
    })
    .filter((x): x is { id: number; title: string } => x != null);
  return { ok: true, status: r.status, lanes, error: null };
}

/** GET /card-types — id для POST /cards (type_id). */
export async function kaitenListCardTypes(auth: KaitenAuth): Promise<{
  ok: boolean;
  status: number;
  types: Array<{ id: number; name: string }>;
  error: string | null;
}> {
  const r = await kaitenFetch(auth, `/card-types`, { method: "GET" });
  const raw = r.json;
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (
    raw != null &&
    typeof raw === "object" &&
    Array.isArray((raw as Record<string, unknown>).data)
  ) {
    arr = (raw as { data: unknown[] }).data;
  }
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      types: [],
      error:
        typeof r.text === "string" && r.text.trim()
          ? r.text.slice(0, 600)
          : `Kaiten HTTP ${r.status}`,
    };
  }
  const types = arr
    .map((x) => {
      if (x == null || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const id = o.id;
      if (typeof id !== "number" || !Number.isFinite(id)) return null;
      const name =
        typeof o.name === "string" && o.name.trim()
          ? o.name.trim()
          : typeof o.title === "string" && o.title.trim()
            ? o.title.trim()
            : null;
      if (!name) return null;
      return { id, name };
    })
    .filter((x): x is { id: number; name: string } => x != null);
  return { ok: true, status: r.status, types, error: null };
}

/**
 * Первая доска в пространстве (число из URL `/space/{spaceId}/`).
 * @see https://developers.kaiten.ru/
 */
export async function kaitenFirstBoardIdInSpace(
  auth: KaitenAuth,
  spaceId: number,
  opts?: KaitenHttpOpts,
): Promise<{ ok: boolean; boardId: number | null; error: string | null }> {
  const r = await kaitenFetch(
    auth,
    `/spaces/${spaceId}/boards`,
    {
      method: "GET",
    },
    opts,
  );
  const arr = Array.isArray(r.json) ? r.json : null;
  if (!r.ok || !arr || arr.length === 0) {
    return {
      ok: false,
      boardId: null,
      error:
        typeof r.text === "string"
          ? r.text.slice(0, 400)
          : "Нет досок в пространстве",
    };
  }
  const first = arr[0];
  if (first == null || typeof first !== "object") {
    return { ok: false, boardId: null, error: "Пустой ответ досок" };
  }
  const id = (first as Record<string, unknown>).id;
  if (typeof id !== "number") {
    return { ok: false, boardId: null, error: "У доски нет id" };
  }
  if (arr.length > 1) {
    console.warn(
      `[kaiten] в пространстве ${spaceId} несколько досок (${arr.length}) — для CRM берём первую (id=${id})`,
    );
  }
  return { ok: true, boardId: id, error: null };
}

/** Определяет пространство CRM по board_id из env. */
export function trackLaneForBoardId(
  boardId: number,
  boardByLane: Partial<Record<KaitenTrackLane, KaitenBoardTarget>>,
  /** Если несколько дорожек указывают на ту же доску — берём сохранённую в наряде. */
  prefer?: KaitenTrackLane | null,
): KaitenTrackLane | null {
  if (prefer) {
    const p = boardByLane[prefer];
    if (p != null && p.boardId != null && p.boardId === boardId) return prefer;
  }
  const lanes: KaitenTrackLane[] = ["ORTHOPEDICS", "ORTHODONTICS", "TEST"];
  for (const lane of lanes) {
    const t = boardByLane[lane];
    if (t != null && t.boardId != null && t.boardId === boardId) return lane;
  }
  return null;
}
