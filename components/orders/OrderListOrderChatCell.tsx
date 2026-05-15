"use client";

import { useState } from "react";
import { useKanbanAdminMentionTag } from "@/components/kanban/use-kanban-admin-mention-tag";
import { OrderListKaitenChatModal } from "@/components/orders/OrderListKaitenChatModal";

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
  labMentionHighlight,
}: {
  orderId: string;
  orderNumber: string;
  /** Показывать подсветку «упомянули лабораторию» (БД + ваш ack). */
  labMentionHighlight: boolean;
}) {
  const [open, setOpen] = useState(false);
  const adminMentionTag = useKanbanAdminMentionTag();

  return (
    <td className="max-md:hidden min-w-0 px-1 py-1 align-middle text-center sm:px-1.5 sm:py-1.5">
      <>
        <button
          type="button"
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent transition-colors hover:bg-[var(--table-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sidebar-blue)] sm:h-7 sm:w-7 ${
            labMentionHighlight
              ? "animate-pulse text-amber-500 dark:text-amber-400"
              : "text-[var(--text-secondary)] hover:text-[var(--app-text)]"
          }`}
          title={
            labMentionHighlight
              ? `В чате упомянули @${adminMentionTag}`
              : "Чат Канбан/Кайтен"
          }
          aria-label="Чат Канбан/Кайтен"
          onClick={() => setOpen(true)}
        >
          <ChatBubbleIcon className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
        </button>
        <OrderListKaitenChatModal
          orderId={orderId}
          orderNumber={orderNumber}
          open={open}
          onClose={() => setOpen(false)}
        />
      </>
    </td>
  );
}
