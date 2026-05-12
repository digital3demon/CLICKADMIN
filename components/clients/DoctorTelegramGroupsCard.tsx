"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const btnBase =
  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm";

export type DoctorTelegramGroupRow = {
  id: string;
  telegramChatId: string;
  label: string | null;
};

export function DoctorTelegramGroupsCard({
  doctorId,
  groups,
  canEditClients,
}: {
  doctorId: string;
  groups: DoctorTelegramGroupRow[];
  canEditClients: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatIdInput, setChatIdInput] = useState("");
  const [labelInput, setLabelInput] = useState("");

  const onAddManual = useCallback(async () => {
    if (!canEditClients) return;
    const chatId = chatIdInput.trim().replace(/\s+/g, "");
    if (!chatId) {
      setError("Введите chat id группы.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/telegram-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramChatId: chatId,
          label: labelInput.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить");
        setBusy(false);
        return;
      }
      setChatIdInput("");
      setLabelInput("");
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  }, [doctorId, labelInput, chatIdInput, router, canEditClients]);

  const onRemove = useCallback(
    async (groupId: string) => {
      if (!canEditClients) return;
      const ok = window.confirm("Отвязать эту группу от врача в CRM?");
      if (!ok) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/doctors/${doctorId}/telegram-groups/${groupId}`,
          { method: "DELETE" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Не удалось отвязать");
          setBusy(false);
          return;
        }
        router.refresh();
      } catch {
        setError("Сеть или сервер недоступны");
      } finally {
        setBusy(false);
      }
    },
    [doctorId, router, canEditClients],
  );

  return (
    <div className="mt-6 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]/60 p-4 sm:col-span-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Группы Telegram
      </h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Создайте группу, добавьте бота — он отправит в группу{" "}
        <span className="font-medium text-[var(--app-text)]">chat id</span> или
        ответит на команду{" "}
        <span className="font-mono text-[var(--app-text)]">/chatid</span> в
        группе. Вставьте id ниже (несколько групп на одного врача). Если бот не
        показывает входящие сообщения с текстом: в @BotFather выполните{" "}
        <span className="font-mono">/setprivacy</span> → Disable (иначе в группе
        видны не все сообщения).
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Сообщения с упоминанием{" "}
        <span className="font-medium text-[var(--app-text)]">
          @clicklab_admin
        </span>{" "}
        попадают в «Мессенджеры», когда Telegram доставляет их боту (см. режим
        privacy выше).
      </p>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {canEditClients ? (
        <div className="mt-4 flex flex-col gap-3 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Chat id группы
            </label>
            <input
              className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 font-mono text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
              placeholder="-1001234567890"
              value={chatIdInput}
              onChange={(e) => setChatIdInput(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Подпись (необязательно)
            </label>
            <input
              className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
              placeholder="Напр. «Клиника …», «Общий чат»"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            className={`${btnBase} shrink-0 bg-[var(--sidebar-blue)] text-white hover:opacity-95 disabled:opacity-50`}
            onClick={() => void onAddManual()}
          >
            {busy ? "…" : "Добавить"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Привязка групп — только с правом «Клиенты: изменение данных».
        </p>
      )}

      {groups.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {groups.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--card-bg)] px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="font-medium text-[var(--app-text)]">
                  {g.label?.trim() || "Группа"}
                </span>
                <span className="ml-2 font-mono tabular-nums text-[var(--text-muted)]">
                  id {g.telegramChatId}
                </span>
              </span>
              {canEditClients ? (
                <button
                  type="button"
                  disabled={busy}
                  className={`${btnBase} border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-body)] hover:bg-[var(--card-bg)] disabled:opacity-50`}
                  onClick={() => void onRemove(g.id)}
                >
                  Отвязать
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Пока нет привязанных групп.
        </p>
      )}
    </div>
  );
}
