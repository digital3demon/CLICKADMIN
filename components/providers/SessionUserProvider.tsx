"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppModule, UserRole } from "@prisma/client";
import type { ClientSessionBootstrap, ClientSessionUser } from "@/lib/auth/client-session-bootstrap.server";
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

export function SessionUserProvider({
  initial,
  children,
}: {
  initial: ClientSessionBootstrap | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<ClientSessionUser | null>(initial?.user ?? null);
  const [singleUser, setSingleUser] = useState(Boolean(initial?.singleUser));
  const [isDemo, setIsDemo] = useState(Boolean(initial?.demo));
  const [ready, setReady] = useState(Boolean(initial?.user));

  const applyPayload = useCallback((j: SessionApiPayload) => {
    const next = parseSessionPayload(j);
    setSingleUser(next.singleUser);
    setIsDemo(next.isDemo);
    setUser(next.user);
    setReady(true);
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/auth/session", {
      cache: "no-store",
      ...(signal ? { signal } : {}),
    });
    const j = (await res.json()) as SessionApiPayload;
    applyPayload(j);
  }, [applyPayload]);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        await refresh(ac.signal);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (!initial?.user) {
          setUser(null);
          setSingleUser(false);
          setIsDemo(false);
          writeClientStorageBucket("live");
        }
        setReady(true);
      }
    })();
    return () => ac.abort();
  }, [refresh, initial?.user]);

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
    <SessionUserContext.Provider value={value}>{children}</SessionUserContext.Provider>
  );
}

export function useSessionUser(): SessionUserContextValue {
  const ctx = useContext(SessionUserContext);
  if (!ctx) {
    throw new Error("useSessionUser: оберните приложение в SessionUserProvider");
  }
  return ctx;
}
