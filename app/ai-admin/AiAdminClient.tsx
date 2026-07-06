"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/toast-store";
import {
  OrderEditForm,
  type OrderEditInitial,
} from "@/components/orders/OrderEditForm";

async function jsonFetch<T = any>(url: string, init?: Omit<RequestInit, "body"> & { body?: any }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Ошибка запроса");
  }
  return res.json();
}

type DiffModalData = {
  realOrderInitial: OrderEditInitial;
  aiOrderInitial: OrderEditInitial;
  orderNumber: string;
  predictionError: string | null;
  kaitenIntegrationActive: boolean;
  kanbanCardUrl: string | null;
  demoKanbanCardTypes: Array<{ id: string; name: string }>;
  isDemoMode: boolean;
};

function predictionField(
  json: Record<string, unknown> | null | undefined,
  key: "clinicHint" | "doctorHint" | "clinicId" | "doctorId",
  legacyKey?: "clinicHint" | "doctorHint",
): string {
  if (!json) return "—";
  const v = json[key];
  if (typeof v === "string" && v.trim()) return v;
  if (legacyKey) {
    const legacy = json[legacyKey];
    if (typeof legacy === "string" && legacy.trim()) return legacy;
  }
  return "—";
}

function AiDiffCompareModal({
  open,
  loading,
  data,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  data: DiffModalData | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex flex-col bg-zinc-900/60"
      role="dialog"
      aria-modal="true"
      aria-label="Сравнение нарядов"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">
            {data ? `Наряд ${data.orderNumber}` : "Загрузка…"}
          </h2>
          <p className="text-sm text-[var(--app-text-secondary)]">
            Слева — как сохранил администратор, справа — как заполнил бы ИИ (только просмотр)
          </p>
        </div>
        <button
          type="button"
          className="rounded-md p-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
          aria-label="Закрыть"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[var(--app-text-secondary)]">
            Загрузка форм…
          </div>
        ) : data?.predictionError ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            Ошибка предсказания ИИ: {data.predictionError}
          </div>
        ) : null}
        {data && !loading ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)]">
              <div className="border-b border-[var(--app-border)] px-4 py-2 text-sm font-medium text-[var(--app-text-secondary)]">
                Сохранил администратор
              </div>
              <OrderEditForm
                key={`real-${data.realOrderInitial.id}`}
                initial={data.realOrderInitial}
                isDemoMode={data.isDemoMode}
                kaitenIntegrationActive={data.kaitenIntegrationActive}
                kanbanCardUrl={data.kanbanCardUrl}
                demoKanbanCardTypes={data.demoKanbanCardTypes}
                canAcceptChatCorrections={false}
                canEditClients={false}
                canEditOrder={false}
                orderPageFrame={{
                  title: `Наряд ${data.orderNumber}`,
                }}
              />
            </div>
            <div className="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)]">
              <div className="border-b border-[var(--app-border)] px-4 py-2 text-sm font-medium text-[var(--app-text-secondary)]">
                Предложил ИИ
              </div>
              <OrderEditForm
                key={`ai-${data.aiOrderInitial.id}`}
                initial={data.aiOrderInitial}
                isDemoMode={data.isDemoMode}
                kaitenIntegrationActive={data.kaitenIntegrationActive}
                kanbanCardUrl={data.kanbanCardUrl}
                demoKanbanCardTypes={data.demoKanbanCardTypes}
                canAcceptChatCorrections={false}
                canEditClients={false}
                canEditOrder={false}
                orderPageFrame={{
                  title: `Наряд ${data.orderNumber} (ИИ)`,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function AiAdminClient({
  initialAiEnabled,
  hasApiKey,
}: {
  initialAiEnabled: boolean;
  hasApiKey: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"diffs" | "settings">("diffs");
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled);
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [diffs, setDiffs] = useState<any[]>([]);
  const [isLoadingDiffs, setIsLoadingDiffs] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState<DiffModalData | null>(null);

  async function loadDiffs() {
    setIsLoadingDiffs(true);
    try {
      const res = await jsonFetch<{ items: any[]; total: number }>("/api/ai-admin/diffs");
      setDiffs(res.items);
    } catch {
      toast.error("Ошибка загрузки предсказаний");
    } finally {
      setIsLoadingDiffs(false);
    }
  }

  if (activeTab === "diffs" && diffs.length === 0 && !isLoadingDiffs) {
    loadDiffs();
  }

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalData(null);
    setModalLoading(false);
  }, []);

  async function openDiffModal(predictionId: string) {
    setModalOpen(true);
    setModalLoading(true);
    setModalData(null);
    try {
      const data = await jsonFetch<DiffModalData>(
        `/api/ai-admin/diffs/${predictionId}/resolve-initial`,
      );
      setModalData(data);
    } catch (e: any) {
      toast.error(e.message || "Не удалось загрузить наряд");
      closeModal();
    } finally {
      setModalLoading(false);
    }
  }

  async function handleSaveSettings() {
    setIsSaving(true);
    try {
      await jsonFetch("/api/ai-admin/settings", {
        method: "POST",
        body: { aiEnabled, apiKey: apiKey || undefined },
      });
      toast.success("Настройки ИИ сохранены");
      if (apiKey) setApiKey("");
    } catch (e: any) {
      toast.error(e.message || "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRunBacktest() {
    setIsBacktesting(true);
    try {
      await jsonFetch("/api/ai-admin/settings", {
        method: "POST",
        body: { aiEnabled, apiKey: apiKey || undefined },
      });
      if (apiKey) setApiKey("");

      const res = await jsonFetch<{ message: string; count: number }>("/api/ai-admin/backtest", {
        method: "POST",
      });
      toast.success(`Запущено ${res.count} предсказаний в фоне`);
    } catch (e: any) {
      toast.error(e.message || "Ошибка запуска");
    } finally {
      setIsBacktesting(false);
    }
  }

  return (
    <ModuleFrame title="ИИ-Админ">
      <AiDiffCompareModal
        open={modalOpen}
        loading={modalLoading}
        data={modalData}
        onClose={closeModal}
      />
      <div className="flex flex-col h-full">
        <div className="flex gap-4 border-b border-[var(--app-border)] p-4">
          <button
            className={`px-4 py-2 rounded-md transition-colors ${activeTab === "diffs" ? "bg-[var(--app-accent)] text-white" : "hover:bg-[var(--app-hover)]"}`}
            onClick={() => setActiveTab("diffs")}
          >
            Diff Viewer
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors ${activeTab === "settings" ? "bg-[var(--app-accent)] text-white" : "hover:bg-[var(--app-hover)]"}`}
            onClick={() => setActiveTab("settings")}
          >
            Настройки
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === "settings" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-xl font-semibold">Настройки OpenRouter</h2>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span>Включить ИИ (Shadow Mode)</span>
                </label>
                <p className="text-sm text-[var(--app-text-secondary)]">
                  Если включено, при создании наряда из письма CRM будет в фоне запрашивать предсказание у ИИ.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block font-medium">API Ключ OpenRouter</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? "•••••••••••••••• (ключ уже задан)" : "sk-or-v1-..."}
                  className="w-full px-3 py-2 border border-[var(--app-border)] rounded-md bg-[var(--app-bg-secondary)]"
                />
                <p className="text-sm text-[var(--app-text-secondary)]">
                  Ключ хранится в базе данных. Оставьте пустым, если не хотите менять текущий.
                </p>
              </div>

              <Button onClick={handleSaveSettings} disabled={isSaving}>
                Сохранить настройки
              </Button>

              <hr className="border-[var(--app-border)] my-8" />

              <h2 className="text-xl font-semibold">Ретроспективный прогон (Backtesting)</h2>
              <p className="text-sm text-[var(--app-text-secondary)] mb-4">
                Запустить ИИ по старым письмам, для которых еще нет предсказаний.
              </p>
              <Button onClick={handleRunBacktest} disabled={isBacktesting} variant="secondary">
                Запустить батч (10 писем)
              </Button>

              <hr className="border-[var(--app-border)] my-8" />

              <h2 className="text-xl font-semibold">Выгрузка датасета</h2>
              <p className="text-sm text-[var(--app-text-secondary)] mb-4">
                Скачать JSONL-файл с историческими парами «Письмо → Наряд» для дообучения (fine-tuning) моделей.
              </p>
              <a href="/api/ai-admin/export" download="ai-dataset.jsonl" className="inline-flex items-center justify-center font-medium transition-colors duration-100 outline-none focus-visible:ring-offset-1 disabled:cursor-not-allowed touch-action-manipulation border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--app-text)] hover:bg-[var(--surface-hover)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--input-border)] h-8 px-3 text-sm gap-2 rounded-lg">
                Скачать dataset.jsonl
              </a>
            </div>
          )}

          {activeTab === "diffs" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Сравнение: Админ vs ИИ</h2>
                  <p className="text-sm text-[var(--app-text-secondary)]">
                    Последние 20 предсказаний ИИ в фоновом режиме.
                  </p>
                </div>
                <Button onClick={loadDiffs} disabled={isLoadingDiffs} variant="secondary">
                  Обновить
                </Button>
              </div>

              {isLoadingDiffs ? (
                <div className="text-center py-8 text-[var(--app-text-secondary)]">Загрузка...</div>
              ) : diffs.length === 0 ? (
                <div className="text-center py-8 text-[var(--app-text-secondary)]">Нет данных.</div>
              ) : (
                <div className="space-y-8">
                  {diffs.map((diff: any) => (
                    <div key={diff.id} className="border border-[var(--app-border)] rounded-lg overflow-hidden bg-[var(--app-bg-secondary)]">
                      <div className="bg-[var(--app-bg)] p-4 border-b border-[var(--app-border)] flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Наряд {diff.order.orderNumber}</span>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                            title="Раскрыть полные формы наряда"
                            aria-label="Раскрыть сравнение нарядов"
                            onClick={() => openDiffModal(diff.id)}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-sm text-[var(--app-text-secondary)]">
                          {new Date(diff.createdAt).toLocaleString("ru-RU")}
                        </div>
                      </div>

                      <div className="p-4 border-b border-[var(--app-border)]">
                        <div className="text-sm font-medium mb-2 text-[var(--app-text-secondary)]">Текст письма:</div>
                        <div className="text-sm whitespace-pre-wrap max-h-40 overflow-y-auto bg-[var(--app-bg)] p-3 rounded border border-[var(--app-border)]">
                          {diff.email.textBody || diff.email.preview}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 divide-x border-[var(--app-border)]">
                        <div className="p-4">
                          <div className="text-sm font-medium mb-3 text-[var(--app-text-secondary)]">Сохранил администратор:</div>
                          <dl className="space-y-2 text-sm">
                            <div><dt className="text-[var(--app-text-secondary)] inline">Пациент:</dt> <dd className="inline font-medium">{diff.order.patientName || "—"}</dd></div>
                            <div><dt className="text-[var(--app-text-secondary)] inline">Клиника:</dt> <dd className="inline font-medium">{diff.order.clinic?.name || "—"}</dd></div>
                            <div><dt className="text-[var(--app-text-secondary)] inline">Врач:</dt> <dd className="inline font-medium">{diff.order.doctor?.fullName || "—"}</dd></div>
                            <div><dt className="text-[var(--app-text-secondary)] inline">Срочно:</dt> <dd className="inline font-medium">{diff.order.isUrgent ? "Да" : "Нет"}</dd></div>
                            <div>
                              <dt className="text-[var(--app-text-secondary)] block mb-1">Описание работы:</dt>
                              <dd className="block bg-[var(--app-bg)] p-2 rounded border border-[var(--app-border)] whitespace-pre-wrap">
                                {diff.order.clientOrderText || "—"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="p-4">
                          <div className="text-sm font-medium mb-3 text-[var(--app-text-secondary)] flex justify-between items-center">
                            <span>Предложил ИИ:</span>
                            {diff.error ? (
                              <span className="text-red-500 text-xs px-2 py-1 bg-red-500/10 rounded">Ошибка</span>
                            ) : (
                              <span className="text-[var(--app-text-secondary)] text-xs">{diff.durationMs}ms | {diff.model.split("/").pop()}</span>
                            )}
                          </div>

                          {diff.error ? (
                            <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded">
                              {diff.error}
                            </div>
                          ) : (
                            <dl className="space-y-2 text-sm">
                              <div><dt className="text-[var(--app-text-secondary)] inline">Пациент:</dt> <dd className="inline font-medium">{diff.predictionJson.patientName || "—"}</dd></div>
                              <div><dt className="text-[var(--app-text-secondary)] inline">Клиника:</dt> <dd className="inline font-medium">{predictionField(diff.predictionJson, "clinicId", "clinicHint")}</dd></div>
                              <div><dt className="text-[var(--app-text-secondary)] inline">Врач:</dt> <dd className="inline font-medium">{predictionField(diff.predictionJson, "doctorId", "doctorHint")}</dd></div>
                              <div><dt className="text-[var(--app-text-secondary)] inline">Срочно:</dt> <dd className="inline font-medium">{diff.predictionJson.urgent ? "Да" : "Нет"}</dd></div>
                              <div>
                                <dt className="text-[var(--app-text-secondary)] block mb-1">Описание работы:</dt>
                                <dd className="block bg-[var(--app-bg)] p-2 rounded border border-[var(--app-border)] whitespace-pre-wrap">
                                  {diff.predictionJson.workDescription || "—"}
                                </dd>
                              </div>
                              {diff.predictionJson.warnings?.length > 0 && (
                                <div className="mt-4">
                                  <dt className="text-amber-500 block mb-1">Предупреждения ИИ:</dt>
                                  <dd className="block bg-amber-500/10 text-amber-600 p-2 rounded text-xs">
                                    <ul className="list-disc pl-4 space-y-1">
                                      {diff.predictionJson.warnings.map((w: string, i: number) => (
                                        <li key={i}>{w}</li>
                                      ))}
                                    </ul>
                                  </dd>
                                </div>
                              )}
                            </dl>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModuleFrame>
  );
}
