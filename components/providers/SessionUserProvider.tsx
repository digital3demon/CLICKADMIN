"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppModule, UserRole } from "@prisma/client";
import type {
  ClientSessionBootstrap,
  ClientSessionUser,
} from "@/lib/auth/client-session-bootstrap.server";
import { CRM_PROFILE_UPDATED_EVENT } from "@/lib/crm-client-events";
import { writeClientStorageBucket } from "@/lib/client-storage-bucket";

type SessionUserContextValue = {
  user: ClientSessionUser | null;
  singleUser: boolean;
  isDemo: boolean;
  /** true после первого снимка (сервер или /api/auth/session). */
  ready: boolean;
  refresh: () => Promise<void>;
};

const SessionUserContext = createContext<SessionUserContextValue | null>(null);

type SessionApiPayload = {
  singleUser?: boolean;
  demo?: boolean;
  user?: {
    id?: string;
    email?: string;
    displayName?: string;
    role?: UserRole;
    actualRole?: UserRole;
    avatarPresetId?: string | null;
    avatarCustomUploadedAt?: string | null;
    moduleAccess?: Record<string, boolean> | null;
  } | null;
};

/** Один in-flight на вкладку — иначе poller/refresh плодит параллельные /session. */
let sharedSessionFetch: Promise<SessionApiPayload> | null = null;

function fetchSessionPayload(signal?: AbortSignal): Promise<SessionApiPayload> {
  if (!sharedSessionFetch) {
    sharedSessionFetch = fetch("/api/auth/session", { cache: "no-store" })
      .then(async (res) => (await res.json()) as SessionApiPayload)
      .finally(() => {
        sharedSessionFetch = null;
      });
  }
  const shared = sharedSessionFetch;
  if (!signal) return shared;
  return new Promise<SessionApiPayload>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    shared.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted) onAbort();
        else resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

function parseSessionPayload(
  j: SessionApiPayload,
): Pick<SessionUserContextValue, "user" | "singleUser" | "isDemo"> {
  const singleUser = Boolean(j.singleUser);
  const isDemo = Boolean(j.demo);
  writeClientStorageBucket(isDemo ? "demo" : "live");
  const u = j.user;
  if (u?.email && u.displayName != null && u.role && u.id) {
    return {
      singleUser,
      isDemo,
      user: {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        actualRole: u.actualRole ?? u.role,
        avatarPresetId: u.avatarPresetId ?? null,
        avatarCustomUploadedAt: u.avatarCustomUploadedAt ?? null,
        moduleAccess:
          (u.moduleAccess as Partial<Record<AppModule, boolean>> | null) ?? {},
      },
    };
  }
  return { singleUser, isDemo, user: null };
}

function bootstrapFingerprint(initial: ClientSessionBootstrap | null): string {
  if (!initial) return "none";
  const u = initial.user;
  if (!u) {
    return `anon|${initial.demo ? 1 : 0}|${initial.singleUser ? 1 : 0}`;
  }
  return [
    u.id,
    u.email,
    u.displayName,
    u.role,
    u.actualRole,
    u.avatarPresetId ?? "",
    u.avatarCustomUploadedAt ?? "",
    initial.demo ? 1 : 0,
    initial.singleUser ? 1 : 0,
  ].join("|");
}

export function SessionUserProvider({
  initial,
  children,
}: {
  initial: ClientSessionBootstrap | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<ClientSessionUser | null>(
    initial?.user ?? null,
  );
  const [singleUser, setSingleUser] = useState(Boolean(initial?.singleUser));
  const [isDemo, setIsDemo] = useState(Boolean(initial?.demo));
  const [ready, setReady] = useState(Boolean(initial?.user));
  const bootKey = bootstrapFingerprint(initial);
  const lastBootKeyRef = useRef(bootKey);

  const applyPayload = useCallback((j: SessionApiPayload) => {
    const next = parseSessionPayload(j);
    setSingleUser(next.singleUser);
    setIsDemo(next.isDemo);
    setUser(next.user);
    setReady(true);
  }, []);

  const applyBootstrap = useCallback((boot: ClientSessionBootstrap) => {
    setSingleUser(Boolean(boot.singleUser));
    setIsDemo(Boolean(boot.demo));
    writeClientStorageBucket(boot.demo ? "demo" : "live");
    setUser(boot.user);
    setReady(true);
  }, []);

  const refresh = useCallback(async () => {
    const j = await fetchSessionPayload();
    applyPayload(j);
  }, [applyPayload]);

  /* SSR/RSC bootstrap: после router.refresh() только синхронизируем props,
   * без повторного GET /api/auth/session (иначе шторм на каждой перерисовке списка). */
  useEffect(() => {
    if (!initial) return;
    if (lastBootKeyRef.current === bootKey) return;
    lastBootKeyRef.current = bootKey;
    applyBootstrap(initial);
  }, [bootKey, initial, applyBootstrap]);

  /* Клиентский hydrate только если нет SSR-снимка — иначе дублируем тяжёлый /session. */
  useEffect(() => {
    if (initial?.user) return;
    const ac = new AbortController();
    void (async () => {
      try {
        const j = await fetchSessionPayload(ac.signal);
        if (ac.signal.aborted) return;
        applyPayload(j);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setUser(null);
        setSingleUser(false);
        setIsDemo(false);
        writeClientStorageBucket("live");
        setReady(true);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate when no bootstrap
  }, []);

  useEffect(() => {
    const onProfileUpdated = () => {
      void refresh();
    };
    window.addEventListener(CRM_PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () =>
      window.removeEventListener(CRM_PROFILE_UPDATED_EVENT, onProfileUpdated);
  }, [refresh]);

  const value = useMemo(
    () => ({ user, singleUser, isDemo, ready, refresh }),
    [user, singleUser, isDemo, ready, refresh],
  );

  return (
    <SessionUserContext.Provider value={value}>
      {children}
    </SessionUserContext.Provider>
  );
}

export function useSessionUser(): SessionUserContextValue {
  const ctx = useContext(SessionUserContext);
  if (!ctx) {
    throw new Error("useSessionUser: оберните приложение в SessionUserProvider");
  }
  return ctx;
}
