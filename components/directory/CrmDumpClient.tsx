"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { defaultDumpMonthKey } from "@/lib/crm-dump/month-bounds";

export function CrmDumpClient() {
  const [month, setMonth] = useState(defaultDumpMonthKey);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okInfo, setOkInfo] = useState<string | null>(null);

  const onDump = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setOkInfo(null);
    try {
      const res = await fetch("/api/directory/crm-dump", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="([^"]+)"/.exec(cd);
      const fileName = m?.[1] ?? `crm-dump-${month}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const orders = res.headers.get("X-Crm-Dump-Orders") ?? "?";
      const users = res.headers.get("X-Crm-Dump-Users") ?? "?";
      const images = res.headers.get("X-Crm-Dump-Images") ?? "?";
      setOkInfo(
        `Готово: нарядов ${orders}, пользователей ${users}, картинок ${images}. Файл скачан.`,
      );
    } catch {
      setErr("Не удалось сформировать дамп");
    } finally {
      setBusy(false);
    }
  }, [month]);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-[var(--app-text)]">
        Срез за месяц
      </h3>
      <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
        Сырой срез за календарный месяц (наряды по дате создания) плюс
        пользователи, матрица доступов, клиники, врачи, прайс, канбан-состояние и
        картинки вложений (PDF и документы не включаются). Обезличивание —
        отдельным шагом: имена/реквизиты + пикселизация фото. При дампе
        читается только БД текущей сессии (рабочая CRM или демо).
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--text-strong)]">Месяц</span>
          <input
            type="month"
            value={month}
            disabled={busy}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none"
          />
        </label>
        <button
          type="button"
          disabled={busy || !month}
          onClick={() => void onDump()}
          className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Формирую…" : "Сформировать дамп"}
        </button>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {okInfo ? (
        <p className="text-sm text-[var(--text-secondary)]">{okInfo}</p>
      ) : null}
      <p className="text-sm">
        <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
          ← Конфигурация
        </Link>
      </p>
    </div>
  );
}
