"use client";

import { normalizeOrdersSearchQuery, ordersListHref } from "@/lib/orders-list-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const inputClass =
  "min-h-9 min-w-0 w-full flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm placeholder:text-[var(--text-placeholder)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:min-w-[12rem]";

type Props = {
  initialValue: string;
  pageSize: number;
  tag?: string | null;
  hideShipped?: boolean;
  onlyShipped?: boolean;
  className?: string;
};

export function OrdersListSearch({
  initialValue,
  pageSize,
  tag,
  hideShipped,
  onlyShipped,
  className = "",
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(normalizeOrdersSearchQuery(sp.get("q")));
  }, [sp]);

  const flushToUrl = useCallback(
    (nextLocal: string) => {
      const q = normalizeOrdersSearchQuery(nextLocal);
      const from = sp.get("from")?.trim() || undefined;
      const to = sp.get("to")?.trim() || undefined;
      router.replace(
        ordersListHref({
          limit: pageSize,
          tag: tag?.trim() ? tag.trim() : undefined,
          hideShipped: hideShipped === true,
          onlyShipped: onlyShipped === true,
          q: q || undefined,
          from,
          to,
        }),
        { scroll: false },
      );
    },
    [router, pageSize, tag, hideShipped, onlyShipped, sp],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const fromUrl = normalizeOrdersSearchQuery(sp.get("q"));
      if (normalizeOrdersSearchQuery(value) === fromUrl) return;
      flushToUrl(value);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, sp, flushToUrl]);

  const onClear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setValue("");
    const from = sp.get("from")?.trim() || undefined;
    const to = sp.get("to")?.trim() || undefined;
    router.replace(
      ordersListHref({
        limit: pageSize,
        tag: tag?.trim() ? tag.trim() : undefined,
        hideShipped: hideShipped === true,
        onlyShipped: onlyShipped === true,
        from,
        to,
      }),
      { scroll: false },
    );
  };

  return (
    <div
      className={`flex min-w-0 flex-1 flex-wrap items-center gap-2 ${className}`.trim()}
    >
      <label className="sr-only" htmlFor="orders-list-search-q">
        Поиск по наряду, врачу, клинике, пациенту
      </label>
      <input
        id="orders-list-search-q"
        type="search"
        className={inputClass}
        placeholder="Наряд, врач, клиника, пациент…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        enterKeyHint="search"
      />
      {value.trim() ? (
        <button
          type="button"
          className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)]"
          onClick={onClear}
        >
          Сбросить
        </button>
      ) : null}
    </div>
  );
}
