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
  keepOpenOnPick?: boolean;
  onClose: () => void;
  onPick: (row: PriceListPickRow) => void;
};

type CreatedPriceListItemResponse = {
  id: string;
  code: string;
  name: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
  description: string | null;
  priceRub: number;
  leadWorkingDays: number | null;
};

const NEW_ORDER_POSITION_SECTION = "НОВЫЕ ПОЗИЦИИ ИЗ ЗАКАЗОВ";

function buildNewOrderPositionCode(): string {
  const now = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NP-${now}-${rnd}`;
}

export function PriceListPickModal({
  open,
  clinicId = null,
  doctorId = null,
  title = "Позиция из прайса",
  keepOpenOnPick = false,
  onClose,
  onPick,
}: PriceListPickModalProps) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PriceListPickRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriceRub, setNewPriceRub] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pickedCount, setPickedCount] = useState(0);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setLoadError(null);
    setCreateOpen(false);
    setCreateError(null);
    setNewName("");
    setNewDescription("");
    setNewPriceRub("");
    setPickedCount(0);
    setPickedIds(new Set());
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
      setPickedCount((n) => n + 1);
      setPickedIds((prev) => {
        const next = new Set(prev);
        next.add(it.id);
        return next;
      });
      if (!keepOpenOnPick) onClose();
    },
    [onPick, onClose, keepOpenOnPick],
  );

  const createAndPick = useCallback(async () => {
    const nm = newName.trim();
    if (!nm) {
      setCreateError("Укажите название");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const rawPrice = newPriceRub.trim();
      const parsedPrice =
        rawPrice === "" ? 0 : Math.max(0, Math.round(Number(rawPrice) || 0));
      const prefixedName = `НОВАЯ ПОЗИЦИЯ "${nm}"`;
      const res = await fetch("/api/price-list-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: buildNewOrderPositionCode(),
          name: prefixedName,
          description: newDescription.trim() || null,
          priceRub: parsedPrice,
          sectionTitle: NEW_ORDER_POSITION_SECTION,
          subsectionTitle: null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | CreatedPriceListItemResponse
        | { error?: string };
      if (!res.ok) {
        setCreateError("error" in data && data.error ? data.error : "Не удалось создать позицию");
        return;
      }
      const row = data as CreatedPriceListItemResponse;
      const pickRow: PriceListPickRow = {
        id: row.id,
        code: row.code,
        name: row.name,
        sectionTitle: row.sectionTitle,
        subsectionTitle: row.subsectionTitle,
        description: row.description,
        priceRub: row.priceRub,
        leadWorkingDays: row.leadWorkingDays,
      };
      onPick(pickRow);
      setPickedCount((n) => n + 1);
      setPickedIds((prev) => {
        const next = new Set(prev);
        next.add(pickRow.id);
        return next;
      });
      if (keepOpenOnPick) {
        setCreateOpen(false);
        setNewName("");
        setNewDescription("");
        setNewPriceRub("");
        return;
      }
      onClose();
    } catch {
      setCreateError("Сеть недоступна");
    } finally {
      setCreating(false);
    }
  }, [keepOpenOnPick, newDescription, newName, newPriceRub, onClose, onPick]);

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
        <div className="flex items-center justify-between gap-3">
          <h2
            id="price-pick-modal-title"
            className="text-base font-semibold text-[var(--app-text)]"
          >
            {title}
          </h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--input-border)] bg-[var(--card-bg)] text-[var(--text-strong)] shadow-sm hover:bg-[var(--surface-hover)]"
            title="Добавить новую позицию"
            aria-label="Добавить новую позицию"
            onClick={(e) => {
              e.stopPropagation();
              setCreateError(null);
              setCreateOpen(true);
            }}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
        <input
          type="search"
          className="mt-3 rounded-md border border-[var(--input-border)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
          placeholder="Поиск по коду, названию, разделу…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {keepOpenOnPick ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Мультивыбор включен: нажимайте несколько позиций подряд. Уже добавлено:{" "}
            <span className="font-semibold text-[var(--text-strong)]">{pickedCount}</span>
          </p>
        ) : null}
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
            <PriceListTabbedBody items={filtered} onPick={pick} pickedIds={pickedIds} />
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

      {createOpen ? (
        <div
          className="fixed inset-0 z-[410] flex items-center justify-center bg-zinc-900/45 p-4"
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            setCreateOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Новая позиция"
            className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[var(--app-text)]">
              Добавить новую позицию
            </h3>
            <div className="mt-3 grid gap-3">
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Название
                </span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 h-9 w-full rounded border border-[var(--input-border)] px-2 text-sm"
                  autoFocus
                />
              </label>
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Краткое описание
                </span>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-[var(--input-border)] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Цена, ₽ (необязательно)
                </span>
                <input
                  value={newPriceRub}
                  onChange={(e) => setNewPriceRub(e.target.value)}
                  className="mt-1 h-9 w-full rounded border border-[var(--input-border)] px-2 text-sm"
                  inputMode="numeric"
                  placeholder="Можно задать позже"
                />
              </label>
            </div>
            {createError ? (
              <p className="mt-2 text-sm text-red-600">{createError}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                onClick={() => setCreateOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={creating || !newName.trim()}
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void createAndPick()}
              >
                {creating ? "Сохранение…" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );

  return createPortal(overlay, document.body);
}
