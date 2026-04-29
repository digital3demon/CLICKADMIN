"use client";

import { useState } from "react";
import { OrderListKaitenChatModal } from "@/components/orders/OrderListKaitenChatModal";
import { useOrderListChatClicklabHighlight } from "@/components/orders/OrdersListKaitenChatShell";

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function OrderListOrderChatCell({
  orderId,
  orderNumber,
  kaitenCardId,
}: {
  orderId: string;
  orderNumber: string;
  kaitenCardId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const clicklab = useOrderListChatClicklabHighlight(orderId);

  return (
    <td className="max-md:hidden min-w-0 px-1.5 py-1.5 align-middle text-center sm:px-2 sm:py-2">
      {kaitenCardId == null ? (
        <span
          className="inline-flex h-6 w-6 items-center justify-center text-[var(--text-muted)] sm:h-7 sm:w-7"
          title="Нет карточки Kaiten — чат недоступен"
        >
          —
        </span>
      ) : (
        <>
          <button
            type="button"
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent transition-colors hover:bg-[var(--table-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sidebar-blue)] sm:h-8 sm:w-8 ${
              clicklab
                ? "text-amber-600 dark:text-amber-400"
                : "text-[var(--text-secondary)] hover:text-[var(--app-text)]"
            }`}
            title={clicklab ? "В чате упомянули @clicklab" : "Чат Kaiten"}
            aria-label="Чат Kaiten"
            onClick={() => setOpen(true)}
          >
            <ChatBubbleIcon className="h-[1.1rem] w-[1.1rem] sm:h-5 sm:w-5" />
          </button>
          <OrderListKaitenChatModal
            orderId={orderId}
            orderNumber={orderNumber}
            open={open}
            onClose={() => setOpen(false)}
          />
        </>
      )}
    </td>
  );
}
