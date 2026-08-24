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
import { useSearchParams } from "next/navigation";

export type OrdersListDueCol = "lab" | "appointment";
export type OrdersListDueTint = "stock" | "muted" | "bright";

type Ctx = {
  tintFor: (col: OrdersListDueCol, orderId: string) => OrdersListDueTint;
  markEdited: (col: OrdersListDueCol, orderId: string) => void;
};

const DueTintCtx = createContext<Ctx | null>(null);

function labEpoch(sp: URLSearchParams): string {
  return `lab:${sp.get("from")?.trim() ?? ""}:${sp.get("to")?.trim() ?? ""}`;
}

function apptEpoch(sp: URLSearchParams): string {
  return `appt:${sp.get("ship")?.trim() ?? ""}:${sp.get("shipFrom")?.trim() ?? ""}:${sp.get("shipTo")?.trim() ?? ""}`;
}

export function OrdersListDueTintProvider({ children }: { children: ReactNode }) {
  const sp = useSearchParams();
  const labKey = labEpoch(sp);
  const apptKey = apptEpoch(sp);

  const [labEdited, setLabEdited] = useState<ReadonlySet<string>>(new Set());
  const [apptEdited, setApptEdited] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setLabEdited(new Set());
  }, [labKey]);

  useEffect(() => {
    setApptEdited(new Set());
  }, [apptKey]);

  const markEdited = useCallback((col: OrdersListDueCol, orderId: string) => {
    const id = orderId.trim();
    if (!id) return;
    const setter = col === "lab" ? setLabEdited : setApptEdited;
    setter((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const tintFor = useCallback(
    (col: OrdersListDueCol, orderId: string): OrdersListDueTint => {
      const edited = col === "lab" ? labEdited : apptEdited;
      if (edited.size === 0) return "stock";
      return edited.has(orderId) ? "bright" : "muted";
    },
    [labEdited, apptEdited],
  );

  const value = useMemo<Ctx>(
    () => ({ tintFor, markEdited }),
    [tintFor, markEdited],
  );

  return <DueTintCtx.Provider value={value}>{children}</DueTintCtx.Provider>;
}

export function useOrdersListDueTint(): Ctx {
  return (
    useContext(DueTintCtx) ?? {
      tintFor: () => "stock",
      markEdited: () => {},
    }
  );
}
