"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";

type Ctx = {
  clicklabByOrderId: Record<string, boolean>;
  patchClicklab: (orderId: string, hasClicklab: boolean) => void;
};

const OrderListChatHighlightContext = createContext<Ctx | null>(null);

export function useOrderListChatClicklabHighlight(orderId: string): boolean {
  const c = useContext(OrderListChatHighlightContext);
  return c?.clicklabByOrderId[orderId] === true;
}

export function useOrderListChatPatchClicklab(): Ctx["patchClicklab"] | null {
  return useContext(OrderListChatHighlightContext)?.patchClicklab ?? null;
}

export function OrdersListKaitenChatShell({
  orderIds,
  pollingEnabled,
  children,
}: {
  orderIds: string[];
  pollingEnabled: boolean;
  children: ReactNode;
}) {
  const [clicklabByOrderId, setClicklabByOrderId] = useState<Record<string, boolean>>(
    {},
  );
  const patchClicklab = useCallback((orderId: string, hasClicklab: boolean) => {
    setClicklabByOrderId((p) => ({ ...p, [orderId]: hasClicklab }));
  }, []);

  const mergeFromSync = useCallback((patch: Record<string, boolean>) => {
    setClicklabByOrderId((p) => ({ ...p, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ clicklabByOrderId, patchClicklab }),
    [clicklabByOrderId, patchClicklab],
  );

  return (
    <OrderListChatHighlightContext.Provider value={value}>
      {pollingEnabled ? (
        <OrderListKaitenPoller
          orderIds={orderIds}
          onSyncExtras={(x) => {
            if (x.clicklabByOrderId) mergeFromSync(x.clicklabByOrderId);
          }}
        />
      ) : null}
      {children}
    </OrderListChatHighlightContext.Provider>
  );
}
