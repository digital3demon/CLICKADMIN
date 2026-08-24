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
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { readClientStorageBucket } from "@/lib/client-storage-bucket";
import { readClientState, writeClientState } from "@/lib/client-state-client";
import {
  collapsedColsAttr,
  collapsedColsPayload,
  ORDERS_LIST_COLLAPSED_COLS_KEY,
  parseCollapsedColIds,
  readCollapsedColsFromLocalStorage,
  toggleCollapsedColId,
  writeCollapsedColsToLocalStorage,
  type OrdersListColId,
} from "@/lib/orders-list-collapsed-cols";

type Ctx = {
  collapsed: readonly OrdersListColId[];
  isCollapsed: (id: OrdersListColId) => boolean;
  toggle: (id: OrdersListColId) => void;
};

const ColumnsCtx = createContext<Ctx | null>(null);

export function useOrdersListColCollapse(): Ctx {
  const ctx = useContext(ColumnsCtx);
  if (!ctx) {
    return {
      collapsed: [],
      isCollapsed: () => false,
      toggle: () => {},
    };
  }
  return ctx;
}

export function OrdersListColumnsProvider({ children }: { children: ReactNode }) {
  const { user, ready, isDemo } = useSessionUser();
  const userId = user?.id?.trim() ?? "";
  const bucket = isDemo ? "demo" : readClientStorageBucket();

  const [collapsed, setCollapsed] = useState<OrdersListColId[]>([]);

  useEffect(() => {
    if (!ready || !userId) {
      setCollapsed([]);
      return;
    }
    let cancelled = false;
    const local = readCollapsedColsFromLocalStorage(userId, bucket);
    setCollapsed(local);
    void (async () => {
      const remote = await readClientState<unknown>(
        "user",
        ORDERS_LIST_COLLAPSED_COLS_KEY,
      );
      if (cancelled) return;
      if (remote != null) {
        const parsed = parseCollapsedColIds(remote);
        setCollapsed(parsed);
        writeCollapsedColsToLocalStorage(userId, parsed, bucket);
        return;
      }
      if (local.length) {
        void writeClientState(
          "user",
          ORDERS_LIST_COLLAPSED_COLS_KEY,
          collapsedColsPayload(local),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, userId, bucket]);

  const toggle = useCallback(
    (id: OrdersListColId) => {
      if (!userId) return;
      setCollapsed((prev) => {
        const next = toggleCollapsedColId(prev, id);
        writeCollapsedColsToLocalStorage(userId, next, bucket);
        void writeClientState(
          "user",
          ORDERS_LIST_COLLAPSED_COLS_KEY,
          collapsedColsPayload(next),
        );
        return next;
      });
    },
    [userId, bucket],
  );

  const value = useMemo<Ctx>(
    () => ({
      collapsed,
      isCollapsed: (id) => collapsed.includes(id),
      toggle,
    }),
    [collapsed, toggle],
  );

  return (
    <ColumnsCtx.Provider value={value}>
      <div
        data-orders-cols=""
        data-orders-collapsed={collapsedColsAttr(collapsed)}
        className="min-w-0 w-full"
      >
        {children}
      </div>
    </ColumnsCtx.Provider>
  );
}
