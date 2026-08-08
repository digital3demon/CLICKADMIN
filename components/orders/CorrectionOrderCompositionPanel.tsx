"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  constructionsToDraft,
  draftToConstructionPayload,
  OrderConstructionsEditor,
  type DraftConstructionLine,
} from "@/components/orders/OrderConstructionsEditor";
import { orderCompositionSubtotalAfterDiscountsRub } from "@/lib/format-order-construction";
import {
  orderUrgentPriceMultiplier,
  parseUrgentSelection,
  urgentSelectionFromOrder,
} from "@/lib/order-urgency";

function moneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

type OrderLiteForComposition = {
  id: string;
  clinicId: string | null;
  doctorId: string;
  isUrgent?: boolean;
  urgentCoefficient?: number | null;
  compositionDiscountPercent?: number;
  financeCalculated?: boolean;
  constructions?: Parameters<typeof constructionsToDraft>[0];
};

/**
 * Состав заказа в раскрытии строки корректировки.
 * «Просчитано» — только Order.financeCalculated (как в карточке наряда).
 * Принятие корректировки — отдельная кнопка «Принять» снаружи / через saveAndAccept.
 */
export function CorrectionOrderCompositionPanel({
  orderId,
  canEdit,
  busy,
  onError,
  registerSave,
}: {
  orderId: string;
  canEdit: boolean;
  busy: boolean;
  onError: (message: string) => void;
  /** Родитель регистрирует save состава перед accept. */
  registerSave?: (fn: (() => Promise<boolean>) | null) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [draftLines, setDraftLines] = useState<DraftConstructionLine[]>([]);
  const [compositionDiscountPercent, setCompositionDiscountPercent] =
    useState(0);
  const [financeCalculated, setFinanceCalculated] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [urgentPriceMult, setUrgentPriceMult] = useState(1);
  const [calcSaving, setCalcSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/orders/${orderId}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as OrderLiteForComposition & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Не удалось загрузить наряд");
        }
        if (cancelled) return;
        setClinicId(data.clinicId ?? null);
        setDoctorId(data.doctorId ?? null);
        setCompositionDiscountPercent(
          typeof data.compositionDiscountPercent === "number"
            ? data.compositionDiscountPercent
            : 0,
        );
        setFinanceCalculated(data.financeCalculated === true);
        setDraftLines(
          constructionsToDraft(
            Array.isArray(data.constructions) ? data.constructions : [],
          ),
        );
        try {
          const sel = urgentSelectionFromOrder(
            data.isUrgent === true,
            data.urgentCoefficient ?? null,
          );
          const u = parseUrgentSelection(sel);
          setUrgentPriceMult(
            orderUrgentPriceMultiplier(u.isUrgent, u.urgentCoefficient),
          );
        } catch {
          setUrgentPriceMult(1);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          onError(
            e instanceof Error ? e.message : "Не удалось загрузить состав",
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

  const financePreviewTotal = useMemo(() => {
    const payload = draftToConstructionPayload(draftLines) as Array<{
      quantity?: number;
      unitPrice?: number | null;
      lineDiscountPercent?: number;
    }>;
    const lines = payload.map((row) => ({
      quantity: typeof row.quantity === "number" ? row.quantity : 1,
      unitPrice:
        row.unitPrice != null &&
        typeof row.unitPrice === "number" &&
        !Number.isNaN(row.unitPrice)
          ? row.unitPrice
          : null,
      lineDiscountPercent:
        typeof row.lineDiscountPercent === "number" &&
        !Number.isNaN(row.lineDiscountPercent)
          ? row.lineDiscountPercent
          : 0,
    }));
    const sub = orderCompositionSubtotalAfterDiscountsRub(
      lines,
      compositionDiscountPercent,
    );
    return Math.round(sub * urgentPriceMult * 100) / 100;
  }, [draftLines, compositionDiscountPercent, urgentPriceMult]);

  const saveComposition = useCallback(async (): Promise<boolean> => {
    const constructions = draftToConstructionPayload(draftLines);
    const patchRes = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        constructions,
        compositionDiscountPercent,
        financeCalculated,
      }),
    });
    const patchJ = (await patchRes.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!patchRes.ok) {
      onError(patchJ.error ?? "Не удалось сохранить состав");
      return false;
    }
    return true;
  }, [
    compositionDiscountPercent,
    draftLines,
    financeCalculated,
    onError,
    orderId,
  ]);

  useEffect(() => {
    if (!registerSave) return;
    registerSave(saveComposition);
    return () => registerSave(null);
  }, [registerSave, saveComposition]);

  const toggleFinanceCalculated = useCallback(
    async (next: boolean) => {
      if (!canEdit || busy || calcSaving) return;
      const prev = financeCalculated;
      setFinanceCalculated(next);
      setCalcSaving(true);
      onError("");
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ financeCalculated: next }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setFinanceCalculated(prev);
          onError(j.error ?? "Не удалось сохранить «Просчитано»");
        }
      } catch {
        setFinanceCalculated(prev);
        onError("Сеть недоступна");
      } finally {
        setCalcSaving(false);
      }
    },
    [busy, calcSaving, canEdit, financeCalculated, onError, orderId],
  );

  if (loading) {
    return (
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Загрузка состава…
      </p>
    );
  }

  return (
    <div className="mt-2 min-w-0 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]/80 px-3 py-2.5">
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Состав заказа
        </h3>
        <div className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-3 gap-y-1">
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] sm:text-xs">
            <span className="whitespace-nowrap">Просчитано</span>
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-[var(--card-border)] bg-[var(--card-bg)]"
              checked={financeCalculated}
              disabled={!canEdit || busy || calcSaving}
              title="Состав проверен и просчитан (ФинОтдел)"
              onChange={(e) => {
                void toggleFinanceCalculated(e.target.checked);
              }}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] sm:text-xs">
            <span className="whitespace-nowrap">Скидка %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              disabled={!canEdit || busy}
              className="w-14 rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-0.5 text-base tabular-nums text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] sm:text-xs"
              value={compositionDiscountPercent}
              onChange={(e) => {
                const v = Number(e.target.value.replace(",", "."));
                if (!Number.isFinite(v)) {
                  setCompositionDiscountPercent(0);
                  return;
                }
                setCompositionDiscountPercent(Math.min(100, Math.max(0, v)));
              }}
            />
          </label>
          <p className="text-right text-xs text-[var(--text-secondary)] sm:text-sm">
            <span className="block sm:inline">
              Итого{" "}
              <strong className="tabular-nums text-[var(--text-strong)]">
                {moneyRu(financePreviewTotal)}
              </strong>
            </span>
            <span className="mt-0.5 block text-[10px] font-normal leading-tight text-[var(--text-muted)] sm:mt-0 sm:ml-2 sm:inline">
              с учётом срочности
            </span>
          </p>
        </div>
      </div>
      <div
        className={`mt-3 min-w-0 overflow-x-auto ${!canEdit ? "pointer-events-none opacity-80" : ""}`}
      >
        <OrderConstructionsEditor
          value={draftLines}
          onChange={canEdit && !busy ? setDraftLines : () => {}}
          clinicId={clinicId}
          doctorId={doctorId}
        />
      </div>
    </div>
  );
}
