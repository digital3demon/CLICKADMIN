/**
 * Клиент PUT/GET /api/client-state.
 *
 * Инварианты против шторма запросов:
 * - один in-flight PUT на ключ (поздние значения coalesce в очередь);
 * - после 400/413/500 — длинный cooldown без сети;
 * - одинаковый payload не пишем повторно;
 * - warn в консоль не чаще раза в минуту на ключ.
 */
import {
  CLIENT_STATE_MAX_JSON_BYTES,
  clientStatePayloadTooLarge,
  jsonUtf8ByteLength,
} from "@/lib/client-state-limits";

export type ClientStateScope = "user" | "tenant";

type GetResponse = { found: boolean; value: unknown };

type WriteSlot = {
  skipUntil: number;
  inFlight: boolean;
  /** Текущая запись + очередь — await, чтобы refresh не читал старый снимок. */
  run: Promise<boolean> | null;
  queued: unknown | undefined;
  hasQueued: boolean;
  lastOkFingerprint: string;
  lastWarnAt: number;
};

const slots = new Map<string, WriteSlot>();

/** Только 413 / локальный oversized — повтор того же тела бесполезен. */
const COOLDOWN_HARD_MS = 5 * 60_000;
/** 500/400 часто транзиент (лок БД, обрезка прокси) — не глушим сохранение на 5 минут. */
const COOLDOWN_TRANSIENT_MS = 20_000;
const COOLDOWN_NETWORK_MS = 60_000;
const WARN_EVERY_MS = 5 * 60_000;

function skipKey(scope: string, key: string): string {
  return `${scope}:${key}`;
}

function getSlot(sk: string): WriteSlot {
  let s = slots.get(sk);
  if (!s) {
    s = {
      skipUntil: 0,
      inFlight: false,
      run: null,
      queued: undefined,
      hasQueued: false,
      lastOkFingerprint: "",
      lastWarnAt: 0,
    };
    slots.set(sk, s);
  }
  return s;
}

function fingerprintPayload(scope: string, key: string, value: unknown): string {
  const bytes = jsonUtf8ByteLength({ scope, key, value });
  // Длина + края JSON — достаточно, чтобы не слать тот же канбан каждые 8с.
  const raw = JSON.stringify({ scope, key, value });
  const head = raw.slice(0, 64);
  const tail = raw.slice(-64);
  return `${bytes}:${head}:${tail}`;
}

function warnOnce(slot: WriteSlot, message: string): void {
  const now = Date.now();
  if (now - slot.lastWarnAt < WARN_EVERY_MS) return;
  slot.lastWarnAt = now;
  console.warn(message);
}

export type ReadClientStateResult<T> =
  | { ok: false }
  | { ok: true; found: false }
  | { ok: true; found: true; value: T };

export async function readClientStateDetailed<T>(
  scope: ClientStateScope,
  key: string,
): Promise<ReadClientStateResult<T>> {
  try {
    const q = new URLSearchParams({ scope, key });
    const res = await fetch(`/api/client-state?${q.toString()}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return { ok: false };
    const j = (await res.json()) as GetResponse;
    if (!j.found) return { ok: true, found: false };
    return { ok: true, found: true, value: j.value as T };
  } catch {
    return { ok: false };
  }
}

export async function readClientState<T>(
  scope: ClientStateScope,
  key: string,
): Promise<T | null> {
  const r = await readClientStateDetailed<T>(scope, key);
  if (!r.ok || !r.found) return null;
  return r.value;
}

async function flushWrite(
  scope: ClientStateScope,
  key: string,
  value: unknown,
): Promise<boolean> {
  const sk = skipKey(scope, key);
  const slot = getSlot(sk);

  if (Date.now() < slot.skipUntil) return false;

  const fp = fingerprintPayload(scope, key, value);
  if (fp === slot.lastOkFingerprint) return true;

  const sized = clientStatePayloadTooLarge(scope, key, value);
  if (sized.tooLarge) {
    slot.skipUntil = Date.now() + COOLDOWN_HARD_MS;
    // Один warn на cooldown: без точных байт в тексте — иначе каждый PUT логирует снова.
    warnOnce(
      slot,
      `[client-state] skip PUT ${scope}/${key}: payload > ${CLIENT_STATE_MAX_JSON_BYTES} bytes (cooldown ${COOLDOWN_HARD_MS / 1000}s)`,
    );
    return false;
  }

  const putOnce = async (body: unknown): Promise<boolean> => {
    const bodyFp = fingerprintPayload(scope, key, body);
    const sizedBody = clientStatePayloadTooLarge(scope, key, body);
    if (sizedBody.tooLarge) {
      slot.skipUntil = Date.now() + COOLDOWN_HARD_MS;
      warnOnce(
        slot,
        `[client-state] skip PUT ${scope}/${key}: payload > ${CLIENT_STATE_MAX_JSON_BYTES} bytes (cooldown ${COOLDOWN_HARD_MS / 1000}s)`,
      );
      return false;
    }
    if (bodyFp === slot.lastOkFingerprint) return true;
    try {
      const res = await fetch("/api/client-state", {
        method: "PUT",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, key, value: body }),
      });
      if (res.ok) {
        slot.lastOkFingerprint = bodyFp;
        slot.skipUntil = 0;
        return true;
      }
      if (res.status === 413) {
        slot.skipUntil = Date.now() + COOLDOWN_HARD_MS;
        slot.hasQueued = false;
        slot.queued = undefined;
        warnOnce(
          slot,
          `[client-state] PUT ${scope}/${key} → HTTP 413 (cooldown ${COOLDOWN_HARD_MS / 1000}s, no retry spam)`,
        );
        return false;
      }
      if (res.status === 400 || res.status === 500) {
        slot.skipUntil = Date.now() + COOLDOWN_TRANSIENT_MS;
        warnOnce(
          slot,
          `[client-state] PUT ${scope}/${key} → HTTP ${res.status} (retry in ${COOLDOWN_TRANSIENT_MS / 1000}s)`,
        );
        return false;
      }
      slot.skipUntil = Date.now() + COOLDOWN_NETWORK_MS;
      return false;
    } catch {
      slot.skipUntil = Date.now() + COOLDOWN_NETWORK_MS;
      return false;
    }
  };

  if (slot.run) {
    slot.queued = value;
    slot.hasQueued = true;
    await slot.run;
    if (Date.now() < slot.skipUntil) return false;
    if (fingerprintPayload(scope, key, value) === slot.lastOkFingerprint) return true;
    return flushWrite(scope, key, value);
  }

  slot.inFlight = true;
  slot.run = (async () => {
    try {
      let current: unknown = value;
      let lastOk = false;
      while (true) {
        lastOk = await putOnce(current);
        if (!slot.hasQueued || Date.now() < slot.skipUntil) break;
        current = slot.queued;
        slot.hasQueued = false;
        slot.queued = undefined;
      }
      return lastOk;
    } finally {
      slot.inFlight = false;
      slot.run = null;
    }
  })();
  return slot.run;
}

export async function writeClientState(
  scope: ClientStateScope,
  key: string,
  value: unknown,
): Promise<boolean> {
  return flushWrite(scope, key, value);
}

export async function deleteClientState(
  scope: ClientStateScope,
  key: string,
): Promise<boolean> {
  const sk = skipKey(scope, key);
  const slot = getSlot(sk);
  slot.lastOkFingerprint = "";
  slot.skipUntil = 0;
  slot.hasQueued = false;
  slot.queued = undefined;
  return writeClientState(scope, key, null);
}

/** Для тестов: сброс слотов. */
export function __resetClientStateClientForTests(): void {
  slots.clear();
}
