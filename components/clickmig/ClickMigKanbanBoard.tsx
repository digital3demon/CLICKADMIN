"use client";

import { useCallback, useEffect, useState } from "react";
import {
  kanbanCardTimerDisplayNowMs,
  kanbanCardTimerElapsedRatio,
  kanbanCardTimerRemainingMs,
  kanbanCardTimerTrackFillColor,
} from "@/lib/kanban/kanban-card-timer";

type Column = { id: string; title: string };

type OrderCard = {
  id: string;
  publicNumber: string;
  status: string;
  kanbanColumnId: string;
  patientName: string;
  doctorName: string | null;
  stageKey: string;
  timerStartedAt: string | null;
  timerDurationMs: number | null;
  timerFrozenAt: string | null;
};

export function ClickMigKanbanBoard() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [tick, setTick] = useState(0);
  const [blockModal, setBlockModal] = useState<OrderCard | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockFields, setBlockFields] = useState<string[]>(["scans"]);

  const load = useCallback(async () => {
    const res = await fetch("/api/clickmig/orders");
    const data = (await res.json()) as {
      columns?: Column[];
      orders?: OrderCard[];
    };
    setColumns(data.columns ?? []);
    setOrders(data.orders ?? []);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [load]);

  async function stageAction(orderId: string, action: "checkmark") {
    await fetch(`/api/clickmig/orders/${orderId}/stage-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
  }

  async function moveColumn(orderId: string, kanbanColumnId: string) {
    await fetch(`/api/clickmig/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kanbanColumnId }),
    });
    await load();
  }

  async function submitBlock() {
    if (!blockModal) return;
    await fetch(`/api/clickmig/orders/${blockModal.id}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: blockReason, blockedFields: blockFields }),
    });
    setBlockModal(null);
    setBlockReason("");
    await load();
  }

  void tick;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.kanbanColumnId === col.id);
          return (
            <div
              key={col.id}
              className="min-w-[240px] flex-shrink-0 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3"
            >
              <h3 className="mb-2 text-sm font-semibold">{col.title}</h3>
              <div className="space-y-2">
                {colOrders.map((o) => {
                  const nowMs = kanbanCardTimerDisplayNowMs(o.timerFrozenAt, Date.now());
                  const ratio = kanbanCardTimerElapsedRatio(
                    o.timerStartedAt,
                    o.timerDurationMs,
                    nowMs,
                  );
                  const remaining = kanbanCardTimerRemainingMs(
                    o.timerStartedAt,
                    o.timerDurationMs,
                    nowMs,
                  );
                  const fill = kanbanCardTimerTrackFillColor(ratio);
                  return (
                    <div
                      key={o.id}
                      className={`rounded-lg border p-2 text-xs ${o.status === "BLOCKED" ? "border-red-400 bg-red-50/80 dark:bg-red-950/30" : "border-[var(--card-border)]"}`}
                    >
                      <div className="font-medium">{o.publicNumber}</div>
                      <div className="text-[var(--muted)]">{o.patientName}</div>
                      {o.timerDurationMs != null && o.timerStartedAt && (
                        <div
                          className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px]"
                          style={{ background: fill }}
                        >
                          {Math.ceil(remaining / 60000)} мин
                        </div>
                      )}
                      {col.id === "col_queue" && o.status !== "BLOCKED" && (
                        <div className="mt-2 flex gap-1">
                          <button
                            type="button"
                            className="rounded bg-green-600 px-2 py-0.5 text-white"
                            onClick={() => void stageAction(o.id, "checkmark")}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className="rounded bg-red-600 px-2 py-0.5 text-white"
                            onClick={() => setBlockModal(o)}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {col.id !== "col_done" && (
                        <select
                          className="mt-2 w-full rounded border border-[var(--card-border)] bg-transparent text-[10px]"
                          value={o.kanbanColumnId}
                          onChange={(e) => void moveColumn(o.id, e.target.value)}
                        >
                          {columns.map((c) => (
                            <option key={c.id} value={c.id}>
                              → {c.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {blockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--card-bg)] p-4 shadow-lg">
            <h3 className="font-semibold">Данные не подходят</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{blockModal.publicNumber}</p>
            <textarea
              className="mt-3 w-full rounded border border-[var(--card-border)] p-2 text-sm"
              rows={3}
              placeholder="Описание проблемы"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
            <div className="mt-2 space-y-1 text-sm">
              {(["scans", "photos", "clientNotes"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={blockFields.includes(f)}
                    onChange={(e) => {
                      setBlockFields((prev) =>
                        e.target.checked
                          ? [...prev, f]
                          : prev.filter((x) => x !== f),
                      );
                    }}
                  />
                  {f === "scans"
                    ? "Сканы"
                    : f === "photos"
                      ? "Фото"
                      : "Задание"}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Загрузите видео в карточку заказа через API /orders/[id]/video
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => setBlockModal(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
                onClick={() => void submitBlock()}
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
