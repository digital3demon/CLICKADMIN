"use client";

import { useCallback, useEffect, useState } from "react";
import type { PayrollUserTrack } from "@prisma/client";
import type { PayrollWorkKindValue } from "@/lib/payroll";
import {
  PAYROLL_USER_TRACK_LABELS,
  type PayrollKindTrackMap,
} from "@/lib/payroll-tracks";

type KindMeta = { kind: PayrollWorkKindValue; label: string };
type TrackMeta = { track: PayrollUserTrack; label: string };

export function PayrollTrackMapPanel() {
  const [kinds, setKinds] = useState<KindMeta[]>([]);
  const [tracks, setTracks] = useState<TrackMeta[]>([]);
  const [map, setMap] = useState<PayrollKindTrackMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll/track-map", { cache: "no-store" });
      const data = (await res.json()) as {
        map?: PayrollKindTrackMap;
        kinds?: KindMeta[];
        tracks?: TrackMeta[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить привязку");
      setMap(data.map ?? null);
      setKinds(Array.isArray(data.kinds) ? data.kinds : []);
      setTracks(Array.isArray(data.tracks) ? data.tracks : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!map) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/payroll/track-map", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ map }),
      });
      const data = (await res.json()) as { map?: PayrollKindTrackMap; error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      if (data.map) setMap(data.map);
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const selectCls =
    "mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--sidebar-blue)]";

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Загрузка привязки категорий…</p>;
  }

  if (!map) {
    return error ? (
      <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p>
    ) : null;
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-strong)]">
        Категории ФОТ → направление техника
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
        Пользователи с ролью «Пользователь» видят в блоке «Что сделано» только плашки своего
        направления. Например, CAD и CAD Хирургия можно привязать к «Цифра».
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kinds.map(({ kind, label }) => (
          <label key={kind} className="block text-sm font-medium text-[var(--text-body)]">
            {label}
            <select
              className={selectCls}
              value={map[kind]}
              onChange={(e) =>
                setMap((prev) =>
                  prev
                    ? { ...prev, [kind]: e.target.value as PayrollUserTrack }
                    : prev,
                )
              }
            >
              {tracks.map(({ track, label: trackLabel }) => (
                <option key={track} value={track}>
                  {trackLabel}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-300">{error}</p>
      ) : null}
      {ok ? (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">Сохранено</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить привязку"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void load()}
          className="rounded-md border border-[var(--input-border)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          Сбросить
        </button>
      </div>
    </div>
  );
}
