"use client";

import { normalizeOrdersSearchQuery, ordersListHref } from "@/lib/orders-list-query";
import { pickOrdersShipmentHrefOpts } from "@/lib/orders-shipment-list-query";
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

type SearchSuggestItem = {
  value: string;
  kind: "order" | "patient" | "doctor" | "clinic";
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
  const spRef = useRef(sp);
  spRef.current = sp;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestItem[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  /**
   * Снимок всего query: меняется только при реальном изменении URL.
   * Не используем `sp`/`sp.get("q")` в deps по отдельности — у useSearchParams() часто новая ссылка на каждом рендере.
   */
  const urlSearchSnapshot = sp.toString();
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    const fromUrl = normalizeOrdersSearchQuery(
      new URLSearchParams(urlSearchSnapshot).get("q"),
    );
    setValue((prev) => (normalizeOrdersSearchQuery(prev) === fromUrl ? prev : fromUrl));
  }, [urlSearchSnapshot]);

  useEffect(() => {
    const q = normalizeOrdersSearchQuery(value);
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    if (!q) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    const ctrl = new AbortController();
    suggestDebounceRef.current = setTimeout(() => {
      setSuggestLoading(true);
      void fetch(`/api/orders/search-suggest?q=${encodeURIComponent(q)}`, {
        credentials: "include",
        signal: ctrl.signal,
      })
        .then(async (res) => {
          if (!res.ok) return { items: [] as SearchSuggestItem[] };
          return (await res.json()) as { items?: SearchSuggestItem[] };
        })
        .then((data) => {
          if (ctrl.signal.aborted) return;
          const items = Array.isArray(data.items) ? data.items : [];
          setSuggestions(items);
          setSuggestOpen(items.length > 0);
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setSuggestions([]);
          setSuggestOpen(false);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSuggestLoading(false);
        });
    }, 220);
    return () => {
      ctrl.abort();
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [value]);

  const flushToUrl = useCallback(
    (nextLocal: string) => {
      const q = normalizeOrdersSearchQuery(nextLocal);
      const cur = spRef.current;
      const from = cur.get("from")?.trim() || undefined;
      const to = cur.get("to")?.trim() || undefined;
      router.replace(
        ordersListHref({
          limit: pageSize,
          tag: tag?.trim() ? tag.trim() : undefined,
          hideShipped: hideShipped === true,
          onlyShipped: onlyShipped === true,
          q: q || undefined,
          from,
          to,
          ...pickOrdersShipmentHrefOpts(cur),
        }),
        { scroll: false },
      );
    },
    [router, pageSize, tag, hideShipped, onlyShipped],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const fromUrl = normalizeOrdersSearchQuery(spRef.current.get("q"));
      if (normalizeOrdersSearchQuery(value) === fromUrl) return;
      flushToUrl(value);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, flushToUrl]);

  const onClear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setValue("");
    setSuggestions([]);
    setSuggestOpen(false);
    const from = spRef.current.get("from")?.trim() || undefined;
    const to = spRef.current.get("to")?.trim() || undefined;
    router.replace(
      ordersListHref({
        limit: pageSize,
        tag: tag?.trim() ? tag.trim() : undefined,
        hideShipped: hideShipped === true,
        onlyShipped: onlyShipped === true,
        from,
        to,
        ...pickOrdersShipmentHrefOpts(spRef.current),
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
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          id="orders-list-search-q"
          type="search"
          className={inputClass}
          placeholder="Наряд, врач, клиника, пациент…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setSuggestOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setSuggestOpen(false), 120);
          }}
          autoComplete="off"
          enterKeyHint="search"
        />
        {suggestOpen ? (
          <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-1 shadow-lg">
            {suggestions.map((s, idx) => (
              <button
                key={`${s.kind}-${s.value}-${idx}`}
                type="button"
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-[var(--app-text)] hover:bg-[var(--surface-subtle)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setValue(s.value);
                  setSuggestOpen(false);
                  flushToUrl(s.value);
                }}
              >
                {s.value}
              </button>
            ))}
            {suggestLoading && suggestions.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-[var(--text-muted)]">Поиск…</div>
            ) : null}
          </div>
        ) : null}
      </div>
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
