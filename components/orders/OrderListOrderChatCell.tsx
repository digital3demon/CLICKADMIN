"use client";

import { useState } from "react";
import { useKanbanAdminMentionTag } from "@/components/kanban/use-kanban-admin-mention-tag";
import { OrderListKaitenChatModal } from "@/components/orders/OrderListKaitenChatModal";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { canAccessOrderChat, canSeeOrderNotificationKind } from "@/lib/auth/permissions";

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
  patientName,
  doctorName,
  labMentionHighlight,
  embedded = false,
  buttonClassName,
}: {
  orderId: string;
  orderNumber: string;
  patientName?: string | null;
  doctorName?: string | null;
  /** Показывать подсветку «упомянули лабораторию» (БД + ваш ack). */
  labMentionHighlight: boolean;
  /** Встроенный режим — без обёртки `<td>` (объединённая колонка таблицы). */
  embedded?: boolean;
  /** Класс кнопки (мобильная карточка — общий стиль с печатью/QR). */
  buttonClassName?: string;
}) {
  const { user } = useSessionUser();
  const chatAllowed =
    user != null &&
    canAccessOrderChat(user.role, user.moduleAccess ?? undefined);
  const showLabMention =
    labMentionHighlight &&
    canSeeOrderNotificationKind(
      "admin",
      user?.role,
      user?.moduleAccess,
    );
  const [open, setOpen] = useState(false);
  const adminMentionTag = useKanbanAdminMentionTag();

  if (!chatAllowed) return null;

  const content = (
    <>
      <button
        type="button"
        className={
          buttonClassName ??
          `inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors hover:bg-[var(--table-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sidebar-blue)] sm:h-6 sm:w-6 ${
            showLabMention
              ? "animate-pulse text-amber-500 dark:text-amber-400"
              : "text-[var(--text-secondary)] hover:text-[var(--app-text)]"
          }`
        }
        title={
          showLabMention
            ? `В чате упомянули @${adminMentionTag}`
            : "Чат Канбан/Кайтен"
        }
        aria-label="Чат Канбан/Кайтен"
        onClick={() => setOpen(true)}
      >
        <ChatBubbleIcon className={buttonClassName ? "h-4 w-4" : "h-3.5 w-3.5 sm:h-4 sm:w-4"} />
      </button>
      <OrderListKaitenChatModal
        orderId={orderId}
        orderNumber={orderNumber}
        patientName={patientName}
        doctorName={doctorName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );

  if (embedded) return content;

  return (
    <td
      data-col="chat"
      className="max-md:hidden min-w-0 px-1 py-1 align-middle text-center sm:px-1.5 sm:py-1.5"
    >
      <div data-col-body>{content}</div>
    </td>
  );
}
