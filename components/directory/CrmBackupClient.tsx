"use client";

import { useCallback, useEffect, useState } from "react";
import { CRM_BACKUP_CONFIRM_PHRASE } from "@/lib/crm-backup/types";

type LastBackup = {
  createdAt: string;
  source: "auto" | "manual";
  storage: "s3" | "disk";
  bytes: number;
  engine: "sqlite" | "postgres";
};

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
}

export function CrmBackupClient() {
  const [last, setLast] = useState<LastBackup | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [busy, setBusy] = useState<"backup" | "restore" | "download" | null>(
    null,
  );
  const [err, setErr] = useState<string | null>(null);
  const [okInfo, setOkInfo] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/directory/crm-backup", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `Ошибка ${res.status}`);
    }
    const j = (await res.json()) as {
      last?: LastBackup | null;
      disabled?: boolean;
    };
    setLast(j.last ?? null);
    setDisabled(Boolean(j.disabled));
  }, []);

  useEffect(() => {
    void refresh().catch((e: unknown) => {
      setErr(e instanceof Error ? e.message : "Не удалось загрузить статус");
    });
  }, [refresh]);

  const onBackup = useCallback(async () => {
    setBusy("backup");
    setErr(null);
    setOkInfo(null);
    try {
      const res = await fetch("/api/directory/crm-backup", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        last?: LastBackup;
      };
      if (!res.ok) {
        setErr(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      if (j.last) setLast(j.last);
      setOkInfo("Бекап записан в хранилище (предыдущий файл перезаписан).");
    } catch {
      setErr("Не удалось сделать бекап");
    } finally {
      setBusy(null);
    }
  }, []);

  const onDownload = useCallback(async () => {
    setBusy("download");
    setErr(null);
    try {
      const res = await fetch("/api/directory/crm-backup?download=1", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "crm-backup-current.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErr("Не удалось скачать бекап");
    } finally {
      setBusy(null);
    }
  }, []);

  const onRestore = useCallback(async () => {
    if (!file) {
      setErr("Выберите zip бекапа");
      return;
    }
    setBusy("restore");
    setErr(null);
    setOkInfo(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("confirm", confirm);
      const res = await fetch("/api/directory/crm-backup/restore", {
        method: "POST",
        credentials: "include",
        body,
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
      };
      if (!res.ok) {
        setErr(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      setOkInfo(
        j.hint ??
          "База восстановлена. Обновите страницу. При ошибках — перезапустите CRM.",
      );
    } catch {
      setErr("Не удалось восстановить");
    } finally {
      setBusy(null);
    }
  }, [confirm, file]);

  return (
    <div className="space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <div>
        <h3 className="text-base font-semibold text-[var(--app-text)]">
          Полный бекап CRM
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
          В архив входит вся база и все файлы: вложения нарядов, почта,
          ClickMig, аватары, шаблоны договоров, датасет ИИ, объекты S3 (кроме
          логов и самих zip-дампов). Каждый день в 00:00 МСК файл в хранилище
          перезаписывается. Восстановление заменяет базу и эти файлы.
        </p>
      </div>
      {disabled ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Автобекап отключён переменной CRM_BACKUP_DISABLE.
        </p>
      ) : null}
      <p className="text-sm text-[var(--text-secondary)]">
        {last
          ? `Последний бекап: ${formatWhen(last.createdAt)} (МСК), ${
              last.source === "auto" ? "авто" : "ручной"
            }, ${last.engine}, ${formatBytes(last.bytes)}, ${
              last.storage === "s3" ? "S3" : "диск"
            }.`
          : "В хранилище ещё нет бекапа."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy != null || disabled}
          onClick={() => void onBackup()}
          className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "backup" ? "Пишу…" : "Сделать бекап"}
        </button>
        <button
          type="button"
          disabled={busy != null || !last}
          onClick={() => void onDownload()}
          className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-strong)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "download" ? "Скачиваю…" : "Скачать текущий"}
        </button>
      </div>
      <div className="space-y-2 border-t border-[var(--card-border)] pt-4">
        <h4 className="text-sm font-semibold text-[var(--text-strong)]">
          Восстановление
        </h4>
        <p className="text-sm text-[var(--text-secondary)]">
          Загрузите zip полного бекапа и введите {CRM_BACKUP_CONFIRM_PHRASE}.
          Текущие данные будут заменены.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--text-strong)]">Файл</span>
          <input
            type="file"
            accept=".zip,application/zip"
            disabled={busy != null}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-[var(--text-strong)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--text-strong)]">
            Подтверждение
          </span>
          <input
            type="text"
            value={confirm}
            disabled={busy != null}
            placeholder={CRM_BACKUP_CONFIRM_PHRASE}
            onChange={(e) => setConfirm(e.target.value)}
            className="max-w-md rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none"
          />
        </label>
        <button
          type="button"
          disabled={busy != null || !file || confirm.trim() !== CRM_BACKUP_CONFIRM_PHRASE}
          onClick={() => void onRestore()}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "restore" ? "Восстанавливаю…" : "Восстановить CRM"}
        </button>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {okInfo ? (
        <p className="text-sm text-[var(--text-secondary)]">{okInfo}</p>
      ) : null}
    </div>
  );
}
