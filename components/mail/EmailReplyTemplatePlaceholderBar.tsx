"use client";

import { EMAIL_REPLY_TEMPLATE_QUICK_INSERT } from "@/lib/mail/email-reply-template";

type Props = {
  onInsert: (token: string) => void;
  disabled?: boolean;
  className?: string;
};

export function EmailReplyTemplatePlaceholderBar({
  onInsert,
  disabled = false,
  className = "",
}: Props) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {EMAIL_REPLY_TEMPLATE_QUICK_INSERT.map((item) => (
        <button
          key={item.token}
          type="button"
          disabled={disabled}
          onClick={() => onInsert(item.token)}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--app-text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
