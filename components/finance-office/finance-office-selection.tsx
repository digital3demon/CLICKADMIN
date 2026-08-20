"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FinanceOfficeSelectionCtx = {
  selected: Set<string>;
  selectedCount: number;
  toggleOne: (id: string, checked: boolean) => void;
  selectVisible: (ids: readonly string[], on: boolean) => void;
};

const Ctx = createContext<FinanceOfficeSelectionCtx | null>(null);

export function FinanceOfficeSelectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const has = prev.has(id);
      if (checked === has) return prev;
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectVisible = useCallback((ids: readonly string[], on: boolean) => {
    setSelected((prev) => {
      if (on) {
        let changed = false;
        const next = new Set(prev);
        for (const id of ids) {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      }
      let changed = false;
      const next = new Set(prev);
      for (const id of ids) {
        if (next.delete(id)) changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  const value = useMemo(
    () => ({
      selected,
      selectedCount: selected.size,
      toggleOne,
      selectVisible,
    }),
    [selected, toggleOne, selectVisible],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinanceOfficeSelection(): FinanceOfficeSelectionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("FinanceOfficeSelectionProvider missing");
  }
  return ctx;
}
