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

export type KanbanCrmUserRow = {
  id: string;
  displayName: string;
  email: string;
  mentionHandle: string | null;
  avatarPresetId: string | null;
  avatarCustomUploadedAt: string | null;
};

type KanbanCrmUsersContextValue = {
  byId: ReadonlyMap<string, KanbanCrmUserRow>;
  list: readonly KanbanCrmUserRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const KanbanCrmUsersContext = createContext<KanbanCrmUsersContextValue | null>(null);

export function KanbanCrmUsersProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<KanbanCrmUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/kanban/crm-users", {
          credentials: "include",
          cache: "no-store",
        });
        const j = (await res.json().catch(() => ({}))) as {
          users?: KanbanCrmUserRow[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setList([]);
          setError(j.error ?? "Не удалось загрузить пользователей");
          return;
        }
        const rows = Array.isArray(j.users) ? j.users : [];
        setList(rows);
      } catch {
        if (!cancelled) {
          setList([]);
          setError("Сеть");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const byId = useMemo(() => {
    const m = new Map<string, KanbanCrmUserRow>();
    for (const u of list) {
      if (u?.id) m.set(u.id, u);
    }
    return m;
  }, [list]);

  const value = useMemo<KanbanCrmUsersContextValue>(
    () => ({
      byId,
      list,
      loading,
      error,
      refresh,
    }),
    [byId, list, loading, error, refresh],
  );

  return (
    <KanbanCrmUsersContext.Provider value={value}>{children}</KanbanCrmUsersContext.Provider>
  );
}

export function useKanbanCrmUsers(): KanbanCrmUsersContextValue {
  const v = useContext(KanbanCrmUsersContext);
  if (!v) {
    return {
      byId: new Map(),
      list: [],
      loading: false,
      error: null,
      refresh: () => {},
    };
  }
  return v;
}
