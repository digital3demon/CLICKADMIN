"use client";

import { useEffect, useState } from "react";
import { useAutosizeTextarea } from "@/lib/use-autosize-textarea";
import { LinkifiedPlainText } from "@/components/ui/LinkifiedPlainText";

export function LinkifiedTextarea({
  value,
  onChange,
  onBlur,
  className = "",
  rows = 3,
  placeholder = "Добавить описание…",
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useAutosizeTextarea(value);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing, textareaRef]);

  const sharedClass = `${className} min-h-[100px] w-full resize-none overflow-hidden whitespace-pre-wrap break-words sm:min-h-[120px]`;

  if (!editing) {
    return (
      <div
        role="textbox"
        tabIndex={0}
        aria-multiline="true"
        className={`${sharedClass} cursor-text`}
        onClick={() => setEditing(true)}
        onFocus={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditing(true);
          }
        }}
      >
        {value.trim() ? (
          <LinkifiedPlainText text={value} />
        ) : (
          <span className="text-[var(--text-muted)]">{placeholder}</span>
        )}
      </div>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      className={sharedClass}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        setEditing(false);
        onBlur?.();
      }}
    />
  );
}
