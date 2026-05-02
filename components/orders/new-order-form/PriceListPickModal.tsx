"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PriceListTabbedBody } from "@/components/price-list/PriceListTabbedBody";

export type PriceListPickRow = {
  id: string;
  code: string;
  name: string;
  sectionTitle?: string | null;
  subsectionTitle?: string | null;
  description?: string | null;
  priceRub: number;
  isIndividualPrice?: boolean;
  leadWorkingDays: number | null;
};

type PriceListPickModalProps = {
  open: boolean;
  clinicId?: string | null;
  doctorId?: string | null;
  title?: string;
  onClose: () => void;
  onPick: (row: PriceListPickRow) => void;
};

export function PriceListPickModal({
  open,
  clinicId = null,
  doctorId = null,
  title = "Позиция из прайса",
  onClose,
  onPick,
}: PriceListPickModalProps) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PriceListPickRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setLoadError(null);
    let cancelled = false;
    (async () => {
      try {
        const hasClinic = Boolean(clinicId && clinicId.trim());
        const hasDoctor = Boolean(doctorId && doctorId.trim());
        const qs =
          hasClinic || hasDoctor
            ? `?${new URLSearchParams({
                ...(hasClinic ? { clinicId: clinicId!.trim() } : {}),
                ...(hasDoctor ? { doctorId: doctorId!.trim() } : {}),
              }).toString()}`
            : "";
        const res = await fetch(`/api/price-list-items${qs}`);
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as PriceListPickRow[];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setLoadError("Не удалось загрузить прайс");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clinicId, doctorId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.code.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        (it.sectionTitle?.toLowerCase().includes(q) ?? false) ||
        (it.subsectionTitle?.toLowerCase().includes(q) ?? false),
    );
  }, [items, search]);

  const pick = useCallback(
    (it: PriceListPickRow) => {
      onPick(it);
      onClose();
    },
    [onPick, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-zinc-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-pick-modal-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl">
        <h2
          id="price-pick-modal-title"
          className="text-base font-semibold text-[var(--app-text)]"
        >
          {title}
        </h2>
        <input
          type="search"
          className="mt-3 rounded-md border border-[var(--input-border)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
          placeholder="Поиск по коду, названию, разделу…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="mt-3 flex min-h-0 min-h-[40vh] flex-1 flex-col overflow-hidden">
          {loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {items.length === 0
                ? "Прайс пуст. Импортируйте: npm run import:price"
                : "Ничего не найдено"}
            </p>
          ) : (
            <PriceListTabbedBody items={filtered} onPick={pick} />
          )}
        </div>
        <div className="mt-4 flex justify-end border-t border-[var(--border-subtle)] pt-3">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
