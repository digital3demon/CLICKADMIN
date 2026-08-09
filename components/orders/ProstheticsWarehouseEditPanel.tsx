"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderProstheticsBlock } from "@/components/orders/OrderProstheticsBlock";
import {
  emptyProsthetics,
  prostheticsFromDb,
  type OrderProstheticsV1,
} from "@/lib/order-prosthetics";

/**
 * Протетика наряда в раскрытии строки «Заказать» / «В пути».
 * Как состав в корректировках: сразу редактор, сохранение перед «Принять»
 * (registerSave) или кнопкой «Сохранить».
 */
export function ProstheticsWarehouseEditPanel({
  orderId,
  canEdit,
  busy,
  onError,
  registerSave,
  onSaved,
}: {
  orderId: string;
  canEdit: boolean;
  busy: boolean;
  onError: (message: string) => void;
  /** Родитель регистрирует save перед accept. */
  registerSave?: (fn: (() => Promise<boolean>) | null) => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<OrderProstheticsV1>(emptyProsthetics);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/orders/${orderId}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          prosthetics?: unknown;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Не удалось загрузить наряд");
        }
        if (cancelled) return;
        setDraft(prostheticsFromDb(data.prosthetics));
      })
      .catch((e) => {
        if (!cancelled) {
          onError(
            e instanceof Error ? e.message : "Не удалось загрузить протетику",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, onError]);

  const saveProsthetics = useCallback(async (): Promise<boolean> => {
    const patchRes = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prosthetics: draft }),
    });
    const patchJ = (await patchRes.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!patchRes.ok) {
      onError(patchJ.error ?? "Не удалось сохранить протетику");
      return false;
    }
    onSaved?.();
    return true;
  }, [draft, onError, onSaved, orderId]);

  useEffect(() => {
    if (!registerSave) return;
    registerSave(saveProsthetics);
    return () => registerSave(null);
  }, [registerSave, saveProsthetics]);

  const saveNow = useCallback(async () => {
    if (!canEdit || busy || saving) return;
    setSaving(true);
    onError("");
    try {
      await saveProsthetics();
    } catch {
      onError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  }, [busy, canEdit, onError, saveProsthetics, saving]);

  if (loading) {
    return (
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Загрузка протетики…
      </p>
    );
  }

  return (
    <div className="mt-2 min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Протетика наряда
        </h3>
        {canEdit ? (
          <button
            type="button"
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
            disabled={busy || saving}
            onClick={() => void saveNow()}
          >
            {saving ? "…" : "Сохранить"}
          </button>
        ) : null}
      </div>
      <div
        className={`min-w-0 ${!canEdit || busy ? "pointer-events-none opacity-80" : ""}`}
      >
        <OrderProstheticsBlock
          value={draft}
          onChange={canEdit && !busy ? setDraft : () => {}}
          idPrefix={`prosthetics-modal-${orderId}`}
          hideBlockTitle
        />
      </div>
    </div>
  );
}
