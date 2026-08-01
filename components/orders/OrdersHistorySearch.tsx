"use client";

import {
  ordersHistoryHref,
  parseOrdersHistoryTab,
} from "@/lib/corrections-history";
import { normalizeRevisionsHistorySearchQuery } from "@/lib/revisions-history";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const inputClass =
  "min-h-9 min-w-0 w-full rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm placeholder:text-[var(--text-placeholder)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

export function OrdersHistorySearch({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const spRef = useRef(sp);
  spRef.current = sp;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urlSearchSnapshot = sp.toString();
  const activeTab = parseOrdersHistoryTab(
    new URLSearchParams(urlSearchSnapshot).get("tab"),
  );
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    const params = new URLSearchParams(urlSearchSnapshot);
    const fromUrl = normalizeRevisionsHistorySearchQuery(params.get("q"));
    setValue((prev) =>
      normalizeRevisionsHistorySearchQuery(prev) === fromUrl ? prev : fromUrl,
    );
  }, [urlSearchSnapshot]);

  const flushToUrl = useCallback(
    (nextLocal: string) => {
      const q = normalizeRevisionsHistorySearchQuery(nextLocal);
      router.replace(
        ordersHistoryHref({ tab: activeTab, q: q || undefined }),
        { scroll: false },
      );
    },
    [router, activeTab],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const fromUrl = normalizeRevisionsHistorySearchQuery(spRef.current.get("q"));
      if (normalizeRevisionsHistorySearchQuery(value) === fromUrl) return;
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
    router.replace(ordersHistoryHref({ tab: activeTab }), { scroll: false });
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="orders-history-search-q">
        Поиск по истории изменений
      </label>
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          id="orders-history-search-q"
          type="search"
          className={inputClass}
          placeholder={
            activeTab === "corrections"
              ? "Наряд, врач, пациент, текст, Kaiten, канбан…"
              : activeTab === "prosthetics"
                ? "Наряд, врач, пациент, текст, в пути, пришла…"
                : activeTab === "tasks"
                  ? "Текст задачи, автор…"
                  : "Наряд, врач, клиника, пользователь, описание…"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
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
