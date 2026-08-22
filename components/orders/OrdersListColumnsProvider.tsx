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

const ORDERS_LIST_COLLAPSED_COLS_LS_DEMO =
  "crm.ordersListCollapsedColsV1.demo";
const ORDERS_LIST_COLLAPSED_COLS_KEY_DEMO = "ordersListCollapsedColsV1Demo";

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

function readCollapsedLocal(isDemo: boolean): OrdersListColId[] {
  if (!isDemo) return readCollapsedColsFromLocalStorage();
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_LIST_COLLAPSED_COLS_LS_DEMO);
    if (!raw) return [];
    return parseCollapsedColIds(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeCollapsedLocal(isDemo: boolean, ids: readonly OrdersListColId[]) {
  if (!isDemo) {
    writeCollapsedColsToLocalStorage(ids);
    return;
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ORDERS_LIST_COLLAPSED_COLS_LS_DEMO,
      JSON.stringify({ v: 1, collapsed: [...ids] }),
    );
  } catch {
    /* quota */
  }
}

export function OrdersListColumnsProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useSessionUser();
  const stateKey = isDemo
    ? ORDERS_LIST_COLLAPSED_COLS_KEY_DEMO
    : ORDERS_LIST_COLLAPSED_COLS_KEY;
  const [collapsed, setCollapsed] = useState<OrdersListColId[]>([]);

  useEffect(() => {
    const local = readCollapsedLocal(isDemo);
    if (local.length) setCollapsed(local);
    else setCollapsed([]);
    let cancelled = false;
    void (async () => {
      const remote = await readClientState<unknown>("user", stateKey);
      if (cancelled) return;
      if (remote != null) {
        const parsed = parseCollapsedColIds(remote);
        setCollapsed(parsed);
        writeCollapsedLocal(isDemo, parsed);
        return;
      }
      if (local.length) {
        void writeClientState(
          "user",
          stateKey,
          collapsedColsPayload(local),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDemo, stateKey]);

  const toggle = useCallback(
    (id: OrdersListColId) => {
      setCollapsed((prev) => {
        const next = toggleCollapsedColId(prev, id);
        writeCollapsedLocal(isDemo, next);
        void writeClientState("user", stateKey, collapsedColsPayload(next));
        return next;
      });
    },
    [isDemo, stateKey],
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
