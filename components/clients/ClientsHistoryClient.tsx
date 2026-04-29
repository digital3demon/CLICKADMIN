"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  describeChangeLine,
  parseContractorRevisionDetails,
} from "@/lib/contractor-revision-details";

type RevisionRow = {
  id: string;
  createdAt: string;
  actorLabel: string;
  kind: string;
  summary: string;
  details: unknown;
  clinicId: string | null;
  doctorId: string | null;
};

type DeletedClinic = { id: string; name: string; deletedAt: string | null };
type DeletedDoctor = { id: string; fullName: string; deletedAt: string | null };

function RevisionEventBody({ r }: { r: RevisionRow }) {
  const parsed = parseContractorRevisionDetails(r.details);
  if (parsed?.mode === "update") {
    return (
      <div>
        <p className="font-medium text-[var(--app-text)]">{parsed.headline}</p>
        {parsed.changes.length > 0 ? (
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[var(--text-strong)]">
            {parsed.changes.map((ch, i) => (
              <li key={i} className="whitespace-pre-wrap">
                {describeChangeLine(ch)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[var(--text-secondary)]">Изменения зафиксированы.</p>
        )}
        <div className="mt-2 text-xs text-[var(--text-muted)]">{r.actorLabel}</div>
      </div>
    );
  }
  if (parsed?.mode === "delete") {
    const filled = parsed.snapshot.filter(
      (row) => row.value != null && String(row.value).trim() !== "",
    );
    return (
      <div>
        <p className="font-medium text-[var(--app-text)]">{parsed.headline}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Данные на момент удаления
        </p>
        {filled.length > 0 ? (
          <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-[var(--text-strong)]">
            {filled.map((row, i) => (
              <li key={i} className="whitespace-pre-wrap">
                <span className="text-[var(--text-muted)]">{row.label}:</span> {row.value}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Заполненных полей не было.
          </p>
        )}
        <div className="mt-2 text-xs text-[var(--text-muted)]">{r.actorLabel}</div>
      </div>
    );
  }
  return (
    <>
      <span className="whitespace-pre-wrap">{r.summary}</span>
      <div className="mt-0.5 text-xs text-[var(--text-muted)]">{r.actorLabel}</div>
    </>
  );
}

function kindLabelRu(k: string): string {
  switch (k) {
    case "CREATE":
      return "Создание";
    case "UPDATE":
      return "Изменение";
    case "DELETE":
      return "Удаление";
    case "RESTORE":
      return "Восстановление";
    default:
      return k;
  }
}

export function ClientsHistoryClient() {
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [deletedClinics, setDeletedClinics] = useState<DeletedClinic[]>([]);
  const [deletedDoctors, setDeletedDoctors] = useState<DeletedDoctor[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/contractor-history");
      const data = (await res.json()) as {
        error?: string;
        revisions?: RevisionRow[];
        deletedClinics?: DeletedClinic[];
        deletedDoctors?: DeletedDoctor[];
      };
      if (!res.ok) {
        setLoadError(
          typeof data.error === "string" ? data.error : "Ошибка загрузки",
        );
        return;
      }
      setRevisions(Array.isArray(data.revisions) ? data.revisions : []);
      setDeletedClinics(
        Array.isArray(data.deletedClinics) ? data.deletedClinics : [],
      );
      setDeletedDoctors(
        Array.isArray(data.deletedDoctors) ? data.deletedDoctors : [],
      );
    } catch {
      setLoadError("Сеть недоступна");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const restoreClinic = async (id: string) => {
    setBusyId(`c-${id}`);
    try {
      const res = await fetch(`/api/clinics/${id}/restore`, { method: "POST" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        alert(typeof d.error === "string" ? d.error : "Ошибка");
        setBusyId(null);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const restoreDoctor = async (id: string) => {
    setBusyId(`d-${id}`);
    try {
      const res = await fetch(`/api/doctors/${id}/restore`, { method: "POST" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        alert(typeof d.error === "string" ? d.error : "Ошибка");
        setBusyId(null);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-10">
      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-[var(--app-text)]">
          Удалённые записи
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Восстановление вернёт клинику или врача в списки и формы нарядов.
        </p>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">Клиники</h3>
            {deletedClinics.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">Нет удалённых.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
                {deletedClinics.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0"
                  >
                    <span className="min-w-0 text-sm text-[var(--text-strong)]">
                      <span className="line-clamp-2 whitespace-pre-line">
                        {c.name}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={busyId === `c-${c.id}`}
                      className="shrink-0 rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      onClick={() => void restoreClinic(c.id)}
                    >
                      {busyId === `c-${c.id}` ? "…" : "Восстановить"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">Врачи</h3>
            {deletedDoctors.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">Нет удалённых.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
                {deletedDoctors.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0"
                  >
                    <span className="text-sm text-[var(--text-strong)]">{d.fullName}</span>
                    <button
                      type="button"
                      disabled={busyId === `d-${d.id}`}
                      className="shrink-0 rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      onClick={() => void restoreDoctor(d.id)}
                    >
                      {busyId === `d-${d.id}` ? "…" : "Восстановить"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--app-text)]">
          Журнал изменений
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Последние события по клиникам и врачам. Ссылка на карточку — если
          запись не удалена.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                <th className="px-3 py-2">Когда</th>
                <th className="px-3 py-2">Тип</th>
                <th className="px-3 py-2">Событие</th>
                <th className="px-3 py-2">Карточка</th>
              </tr>
            </thead>
            <tbody>
              {revisions.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-[var(--text-muted)]"
                  >
                    Записей пока нет.
                  </td>
                </tr>
              ) : (
                revisions.map((r) => {
                  const when = new Date(r.createdAt);
                  const href = r.clinicId
                    ? `/clients/${r.clinicId}`
                    : r.doctorId
                      ? `/clients/doctors/${r.doctorId}`
                      : null;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--border-subtle)] align-top"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">
                        {Number.isNaN(when.getTime())
                          ? "—"
                          : when.toLocaleString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-body)]">
                        {kindLabelRu(r.kind)}
                      </td>
                      <td className="max-w-xl min-w-[280px] px-3 py-2 text-[var(--text-strong)]">
                        <RevisionEventBody r={r} />
                      </td>
                      <td className="px-3 py-2">
                        {href ? (
                          <Link
                            href={href}
                            className="text-[var(--sidebar-blue)] hover:underline"
                          >
                            Открыть
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
