"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
  const [collapsed, setCollapsed] = useState<OrdersListColId[]>([]);

  useEffect(() => {
    const local = readCollapsedColsFromLocalStorage();
    if (local.length) setCollapsed(local);
    let cancelled = false;
    void (async () => {
      const remote = await readClientState<unknown>(
        "user",
        ORDERS_LIST_COLLAPSED_COLS_KEY,
      );
      if (cancelled) return;
      if (remote != null) {
        const parsed = parseCollapsedColIds(remote);
        setCollapsed(parsed);
        writeCollapsedColsToLocalStorage(parsed);
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
  }, []);

  const toggle = useCallback((id: OrdersListColId) => {
    setCollapsed((prev) => {
      const next = toggleCollapsedColId(prev, id);
      writeCollapsedColsToLocalStorage(next);
      void writeClientState(
        "user",
        ORDERS_LIST_COLLAPSED_COLS_KEY,
        collapsedColsPayload(next),
      );
      return next;
    });
  }, []);

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
        style={
          {
            "--orders-collapsed-rail-w": `${collapsed.length * 14}px`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </ColumnsCtx.Provider>
  );
}
