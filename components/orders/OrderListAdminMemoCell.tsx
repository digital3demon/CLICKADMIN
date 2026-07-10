"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_LEN = 100;

/**
 * Мини-блокнот смен в строке списка: пусто почти невидимо, по hover/focus — каретка.
 * Светлоянтарный текст. Не связан с Order.notes / Kaiten.
 */
export function OrderListAdminMemoCell({
  orderId,
  initialMemo,
}: {
  orderId: string;
  initialMemo: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(() => (initialMemo ?? "").slice(0, MAX_LEN));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const savedRef = useRef((initialMemo ?? "").trim());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const next = (initialMemo ?? "").slice(0, MAX_LEN);
    setValue(next);
    savedRef.current = next.trim();
  }, [initialMemo, orderId]);

  const persist = useCallback(async () => {
    const next = value.trim().slice(0, MAX_LEN);
    if (next === savedRef.current) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listAdminMemo: next || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Не сохранено");
        setValue(savedRef.current);
        return;
      }
      savedRef.current = next;
      setValue(next);
      router.refresh();
    } catch {
      setErr("Сеть недоступна");
      setValue(savedRef.current);
    } finally {
      setSaving(false);
    }
  }, [orderId, router, value]);

  const hasText = value.trim().length > 0;
  const showActive = focused || hasText;

  return (
    <div
      className="group/memo relative mx-auto w-full max-w-[7.5rem]"
      title="Пометка смен (до 100 символов). Не уходит в наряд и Kaiten."
    >
      <textarea
        ref={textareaRef}
        rows={2}
        maxLength={MAX_LEN}
        value={value}
        disabled={saving}
        aria-label="Пометка смен"
        placeholder=""
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          void persist();
        }}
        onChange={(e) => {
          setErr(null);
          setValue(e.target.value.slice(0, MAX_LEN));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            textareaRef.current?.blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setValue(savedRef.current);
            textareaRef.current?.blur();
          }
        }}
        className={[
          "block w-full resize-none rounded-md border bg-transparent px-1 py-0.5 text-center text-[10px] font-semibold leading-snug outline-none transition-[border-color,background-color,box-shadow] sm:text-[11px]",
          "text-amber-700 caret-amber-600 placeholder:text-transparent dark:text-amber-300/90 dark:caret-amber-300",
          showActive
            ? "border-amber-300/70 bg-amber-50/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 dark:border-amber-700/50 dark:bg-amber-950/25"
            : "border-transparent hover:border-amber-300/40 hover:bg-amber-50/20 dark:hover:border-amber-800/40 dark:hover:bg-amber-950/15",
          saving ? "opacity-60" : "",
        ].join(" ")}
      />
      {err ? (
        <p className="mt-0.5 truncate text-center text-[9px] text-red-600">{err}</p>
      ) : null}
    </div>
  );
}
