"use client";

import {
  buildClientsListUrl,
  clientsListStateFromSearchParams,
  normalizeClientsSearchQuery,
} from "@/lib/clients-list-search";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const inputClass =
  "w-full max-w-md rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm placeholder:text-[var(--text-placeholder)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

type Props = {
  mode: "clinic" | "doctor";
  initialValue: string;
  placeholder: string;
  className?: string;
};

export function ClientsListSearch({
  mode,
  initialValue,
  placeholder,
  className = "",
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const spRef = useRef(sp);
  spRef.current = sp;
  const inputRef = useRef<HTMLInputElement>(null);
  const param = mode === "clinic" ? "clinicQ" : "doctorQ";

  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urlSnapshot = sp.toString();
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    const snap = new URLSearchParams(urlSnapshot);
    const fromUrl = normalizeClientsSearchQuery(snap.get(param) ?? undefined);
    setValue((prev) =>
      normalizeClientsSearchQuery(prev) === fromUrl ? prev : fromUrl,
    );
  }, [urlSnapshot, param]);

  const flushToUrl = useCallback(
    (nextLocal: string) => {
      const base = clientsListStateFromSearchParams(spRef.current, mode);
      const nextQuery = normalizeClientsSearchQuery(nextLocal);
      const clinicQ = mode === "clinic" ? nextQuery : base.clinicQ;
      const doctorQ = mode === "doctor" ? nextQuery : base.doctorQ;
      router.replace(
        buildClientsListUrl({
          ...base,
          view: mode,
          clinicQ,
          doctorQ,
          clinicPage: mode === "clinic" ? 1 : base.clinicPage,
          doctorPage: mode === "doctor" ? 1 : base.doctorPage,
        }),
        { scroll: false },
      );
    },
    [router, mode],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const fromUrl = normalizeClientsSearchQuery(spRef.current.get(param) ?? undefined);
      if (normalizeClientsSearchQuery(value) === fromUrl) return;
      flushToUrl(value);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, param, flushToUrl]);

  const onClear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setValue("");
    const base = clientsListStateFromSearchParams(spRef.current, mode);
    const clinicQ = mode === "clinic" ? "" : base.clinicQ;
    const doctorQ = mode === "doctor" ? "" : base.doctorQ;
    router.replace(
      buildClientsListUrl({
        ...base,
        view: mode,
        clinicQ,
        doctorQ,
        clinicPage: mode === "clinic" ? 1 : base.clinicPage,
        doctorPage: mode === "doctor" ? 1 : base.doctorPage,
      }),
      { scroll: false },
    );
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <label className="sr-only" htmlFor={`clients-search-${mode}`}>
        {placeholder}
      </label>
      <input
        ref={inputRef}
        id={`clients-search-${mode}`}
        type="search"
        className={inputClass}
        placeholder={placeholder}
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
