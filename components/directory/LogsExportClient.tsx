"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DateRangePresets } from "@/components/ui/DateRangePresets";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const LEVEL_OPTIONS = [
  { value: "all", label: "Все уровни" },
  { value: "debug", label: "debug и выше" },
  { value: "info", label: "info и выше" },
  { value: "warn", label: "warn и выше" },
  { value: "error", label: "только error/fatal" },
] as const;

const CHANNEL_OPTIONS = [
  { value: "all", label: "Все каналы" },
  { value: "kaiten", label: "Kaiten" },
  { value: "cron", label: "Cron / фон" },
  { value: "mail", label: "Почта" },
  { value: "api", label: "API" },
  { value: "audit", label: "Аудит" },
  { value: "security", label: "Безопасность" },
] as const;

export function LogsExportClient() {
  const [from, setFrom] = useState(todayKey);
  const [to, setTo] = useState(todayKey);
  const [level, setLevel] = useState<(typeof LEVEL_OPTIONS)[number]["value"]>("all");
  const [channel, setChannel] =
    useState<(typeof CHANNEL_OPTIONS)[number]["value"]>("all");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<{
    logDir: string;
    days: string[];
    oldestDay: string | null;
    newestDay: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/directory/logs/info", {
          credentials: "include",
          cache: "no-store",
        });
        const j = (await res.json().catch(() => ({}))) as {
          logDir?: string;
          days?: string[];
          oldestDay?: string | null;
          newestDay?: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setInfo(null);
          return;
        }
        setInfo({
          logDir: j.logDir ?? "",
          days: Array.isArray(j.days) ? j.days : [],
          oldestDay: j.oldestDay ?? null,
          newestDay: j.newestDay ?? null,
        });
      } catch {
        if (!cancelled) setInfo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadUrl = useMemo(() => {
    const p = new URLSearchParams({ from, to });
    if (level !== "all") p.set("level", level);
    if (channel !== "all") p.set("channel", channel);
    return `/api/directory/logs/export?${p.toString()}`;
  }, [from, to, level, channel]);

  const onDownload = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(downloadUrl, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="([^"]+)"/.exec(cd);
      const filename = m?.[1] ?? `crm-logs_${from}_${to}.txt`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr("Не удалось скачать файл");
    } finally {
      setBusy(false);
    }
  }, [downloadUrl, from, to]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-[var(--text-secondary)]">
        Логи пишутся на сервер в суточные файлы JSONL и выгружаются в читаемый
        .txt. В выгрузку попадают записи с момента включения записи на диск.
        Пароли и токены маскируются автоматически.
      </p>

      {info ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <div>
            Каталог: <span className="font-mono">{info.logDir}</span>
          </div>
          {info.days.length > 0 ? (
            <div className="mt-1">
              Файлы на диске: {info.oldestDay} — {info.newestDay} (
              {info.days.length} дн.)
            </div>
          ) : (
            <div className="mt-1">Пока нет файлов логов — появятся после перезапуска сервера.</div>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--app-text)]">
          Период
        </label>
        <DateRangePresets
          currentFrom={from}
          currentTo={to}
          onSelect={(f, t) => {
            setFrom(f);
            setTo(t);
          }}
        />
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--text-muted)]">С</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--text-muted)]">По</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--app-text)]">Уровень</span>
          <select
            value={level}
            onChange={(e) =>
              setLevel(e.target.value as (typeof LEVEL_OPTIONS)[number]["value"])
            }
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5"
          >
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--app-text)]">Канал</span>
          <select
            value={channel}
            onChange={(e) =>
              setChannel(
                e.target.value as (typeof CHANNEL_OPTIONS)[number]["value"],
              )
            }
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5"
          >
            {CHANNEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {err ? (
        <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void onDownload()}
        className="rounded-lg bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Подготовка…" : "Скачать .txt"}
      </button>
    </div>
  );
}
