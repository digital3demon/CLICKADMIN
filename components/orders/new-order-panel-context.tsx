"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { OrderDraftSnapshot } from "@/lib/order-draft-snapshot";
import { isDraftWorthy } from "@/lib/order-draft-snapshot";
import {
  addDraft,
  type StoredOrderDraft,
  removeDraft,
} from "@/lib/draft-orders-storage";

export const NEW_ORDER_PANEL_MAX = 5;

export type PanelSnapshotGetter = () => OrderDraftSnapshot;

export type NewOrderPanelItem = {
  id: string;
  collapsed: boolean;
  initialSnapshot?: OrderDraftSnapshot | null;
};

type NewOrderPanelContextValue = {
  open: () => boolean;
  close: (id: string, options?: { skipDraft?: boolean }) => void;
  collapse: (id: string) => void;
  /** Пустой черновик — закрыть; есть данные — свернуть в полоску (как «Свернуть»). */
  dismissExpandedPanel: (id: string) => void;
  expand: (id: string) => void;
  openFromDraft: (draft: StoredOrderDraft) => boolean;
  registerPanelSnapshot: (
    panelId: string,
    getter: PanelSnapshotGetter,
  ) => () => void;
  panels: readonly NewOrderPanelItem[];
  canOpen: boolean;
};

const NewOrderPanelContext = createContext<NewOrderPanelContextValue | null>(
  null,
);

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function NewOrderPanelProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<NewOrderPanelItem[]>([]);
  const gettersRef = useRef(new Map<string, PanelSnapshotGetter>());

  const registerPanelSnapshot = useCallback(
    (panelId: string, getter: PanelSnapshotGetter) => {
      gettersRef.current.set(panelId, getter);
      return () => {
        gettersRef.current.delete(panelId);
      };
    },
    [],
  );

  const open = useCallback(() => {
    let added = false;
    setPanels((prev) => {
      if (prev.length >= NEW_ORDER_PANEL_MAX) {
        return prev;
      }
      added = true;
      return [...prev, { id: newId(), collapsed: false }];
    });
    return added;
  }, []);

  const close = useCallback((id: string, options?: { skipDraft?: boolean }) => {
    setPanels((prev) => {
      if (!options?.skipDraft) {
        const idx = prev.findIndex((p) => p.id === id);
        const draftTag = `Черновик ${idx + 1}`;
        const getter = gettersRef.current.get(id);
        const snap = getter?.();
        if (snap && isDraftWorthy(snap)) {
          const label = snap.patientName.trim()
            ? `${draftTag} · ${snap.patientName.trim()}`
            : draftTag;
          addDraft(snap, label);
        }
      }
      gettersRef.current.delete(id);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const collapse = useCallback((id: string) => {
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const getter = gettersRef.current.get(id);
        const snap = getter?.();
        const frozen =
          snap != null
            ? (JSON.parse(JSON.stringify(snap)) as OrderDraftSnapshot)
            : p.initialSnapshot;
        return {
          ...p,
          collapsed: true,
          initialSnapshot: frozen ?? p.initialSnapshot ?? null,
        };
      }),
    );
  }, []);

  const expand = useCallback((id: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, collapsed: false } : p)),
    );
  }, []);

  const dismissExpandedPanel = useCallback(
    (id: string) => {
      const getter = gettersRef.current.get(id);
      const snap = getter?.();
      if (snap && isDraftWorthy(snap)) {
        collapse(id);
      } else {
        close(id);
      }
    },
    [close, collapse],
  );

  const openFromDraft = useCallback((draft: StoredOrderDraft): boolean => {
    let added = false;
    setPanels((prev) => {
      if (prev.length >= NEW_ORDER_PANEL_MAX) {
        return prev;
      }
      added = true;
      return [
        ...prev,
        {
          id: newId(),
          collapsed: false,
          initialSnapshot: draft.snapshot,
        },
      ];
    });
    if (added) {
      removeDraft(draft.id);
    }
    return added;
  }, []);

  const canOpen = panels.length < NEW_ORDER_PANEL_MAX;

  const value = useMemo(
    () => ({
      open,
      close,
      collapse,
      dismissExpandedPanel,
      expand,
      openFromDraft,
      registerPanelSnapshot,
      panels,
      canOpen,
    }),
    [
      open,
      close,
      collapse,
      dismissExpandedPanel,
      expand,
      openFromDraft,
      registerPanelSnapshot,
      panels,
      canOpen,
    ],
  );

  return (
    <NewOrderPanelContext.Provider value={value}>
      {children}
    </NewOrderPanelContext.Provider>
  );
}

export function useNewOrderPanel() {
  const ctx = useContext(NewOrderPanelContext);
  if (!ctx) {
    throw new Error(
      "useNewOrderPanel: оберните приложение в NewOrderPanelProvider",
    );
  }
  return ctx;
}
