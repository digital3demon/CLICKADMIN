"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContractorsLifecycleReport } from "@/lib/analytics/clients-lifecycle";
import { formatYmdRu } from "@/lib/analytics/compare-periods";

const SECTIONS = [
  { id: "newDoctors" as const, label: "Новые доктора" },
  { id: "newClinics" as const, label: "Новые клиники" },
  { id: "returnedDoctors" as const, label: "Вернувшиеся доктора" },
  { id: "returnedClinics" as const, label: "Вернулись клиники" },
  { id: "disappeared" as const, label: "Клиника и доктора пропали" },
];

type SectionId = (typeof SECTIONS)[number]["id"];

function clinicsText(names: string[]): string {
  return names.length > 0 ? names.join(", ") : "—";
}

function Empty({ text }: { text: string }) {
  return <p className="px-3 py-4 text-sm text-[var(--text-muted)]">{text}</p>;
}

export function AnalyticsContractorsLifecyclePanel({
  data,
  onChanged,
}: {
  data: ContractorsLifecycleReport;
  onChanged: () => void;
}) {
  const [section, setSection] = useState<SectionId>("newDoctors");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const counts: Record<SectionId, number> = {
    newDoctors: data.newDoctors.length,
    newClinics: data.newClinics.length,
    returnedDoctors: data.returnedDoctors.length,
    returnedClinics: data.returnedClinics.length,
    disappeared: data.disappearedDoctors.length + data.disappearedClinics.length,
  };

  async function markExisting(kind: "doctor" | "clinic", id: string) {
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch("/api/analytics/contractors/mark-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Не удалось сохранить");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--app-text)]">
          Новые, вернувшиеся и пропавшие
        </h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Новые — появились в базе в выбранном периоде. Вернувшиеся — не было
          заказов от 3 месяцев, затем снова пришла работа. Пропали — нет заказов
          больше 45 дней.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={
              section === s.id
                ? "rounded-full bg-[var(--sidebar-blue)] px-2.5 py-1 text-[11px] font-semibold text-white"
                : "rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)]"
            }
            onClick={() => setSection(s.id)}
          >
            {s.label}
            <span className="ml-1 tabular-nums opacity-80">{counts[s.id]}</span>
          </button>
        ))}
      </div>
      {err ? (
        <p className="text-xs text-red-600 dark:text-red-400">{err}</p>
      ) : null}

      {section === "newDoctors" ? (
        data.newDoctors.length === 0 ? (
          <Empty text="За период новых докторов в базе нет." />
        ) : (
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                <th className="py-1.5 pr-2">Врач</th>
                <th className="py-1.5 pr-2">Клиника</th>
                <th className="py-1.5 pr-2">В базе с</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {data.newDoctors.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                  <td className="py-1.5 pr-2">
                    <Link
                      href={`/clients/doctors/${r.id}`}
                      className="font-medium text-[var(--sidebar-blue)] hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-2 text-[var(--text-body)]">
                    {clinicsText(r.clinicNames)}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatYmdRu(r.inDbOn)}</td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void markExisting("doctor", r.id)}
                      className="rounded border border-[var(--card-border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    >
                      не новый доктор
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : null}

      {section === "newClinics" ? (
        data.newClinics.length === 0 ? (
          <Empty text="За период новых клиник в базе нет." />
        ) : (
          <table className="w-full min-w-[420px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                <th className="py-1.5 pr-2">Клиника</th>
                <th className="py-1.5 pr-2">В базе с</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {data.newClinics.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                  <td className="py-1.5 pr-2">
                    <Link
                      href={`/clients/${r.id}`}
                      className="font-medium text-[var(--sidebar-blue)] hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatYmdRu(r.inDbOn)}</td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void markExisting("clinic", r.id)}
                      className="rounded border border-[var(--card-border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    >
                      не новая клиника
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : null}

      {section === "returnedDoctors" ? (
        data.returnedDoctors.length === 0 ? (
          <Empty text="За период никто не вернулся после паузы от 3 месяцев." />
        ) : (
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                <th className="py-1.5 pr-2">Врач</th>
                <th className="py-1.5 pr-2">Клиника</th>
                <th className="py-1.5 pr-2">Вернулся</th>
                <th className="py-1.5 pr-2">Пред. заказ</th>
                <th className="py-1.5">Пауза</th>
              </tr>
            </thead>
            <tbody>
              {data.returnedDoctors.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                  <td className="py-1.5 pr-2">
                    <Link
                      href={`/clients/doctors/${r.id}`}
                      className="font-medium text-[var(--sidebar-blue)] hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-2">{clinicsText(r.clinicNames)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatYmdRu(r.returnedOn)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatYmdRu(r.previousOn)}</td>
                  <td className="py-1.5 tabular-nums">{r.gapDays} дн.</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : null}

      {section === "returnedClinics" ? (
        data.returnedClinics.length === 0 ? (
          <Empty text="За период ни одна клиника не вернулась после паузы от 3 месяцев." />
        ) : (
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                <th className="py-1.5 pr-2">Клиника</th>
                <th className="py-1.5 pr-2">Вернулась</th>
                <th className="py-1.5 pr-2">Пред. заказ</th>
                <th className="py-1.5">Пауза</th>
              </tr>
            </thead>
            <tbody>
              {data.returnedClinics.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                  <td className="py-1.5 pr-2">
                    <Link
                      href={`/clients/${r.id}`}
                      className="font-medium text-[var(--sidebar-blue)] hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatYmdRu(r.returnedOn)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatYmdRu(r.previousOn)}</td>
                  <td className="py-1.5 tabular-nums">{r.gapDays} дн.</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : null}

      {section === "disappeared" ? (
        data.disappearedClinics.length === 0 && data.disappearedDoctors.length === 0 ? (
          <Empty text="Нет клиник и докторов без заказов больше 45 дней." />
        ) : (
          <div className="space-y-5">
            {data.disappearedClinics.length > 0 ? (
              <div>
                <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Клиники
                </h4>
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] text-[11px] font-semibold uppercase text-[var(--text-secondary)]">
                      <th className="py-1.5 pr-2">Клиника</th>
                      <th className="py-1.5 pr-2">Последний заказ</th>
                      <th className="py-1.5">Простой</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.disappearedClinics.map((r) => (
                      <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                        <td className="py-1.5 pr-2">
                          <Link
                            href={`/clients/${r.id}`}
                            className="font-medium text-[var(--sidebar-blue)] hover:underline"
                          >
                            {r.name}
                          </Link>
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {formatYmdRu(r.lastOrderOn)}
                        </td>
                        <td className="py-1.5 tabular-nums">{r.idleDays} дн.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {data.disappearedDoctors.length > 0 ? (
              <div>
                <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Доктора
                </h4>
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] text-[11px] font-semibold uppercase text-[var(--text-secondary)]">
                      <th className="py-1.5 pr-2">Врач</th>
                      <th className="py-1.5 pr-2">Клиника</th>
                      <th className="py-1.5 pr-2">Последний заказ</th>
                      <th className="py-1.5">Простой</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.disappearedDoctors.map((r) => (
                      <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                        <td className="py-1.5 pr-2">
                          <Link
                            href={`/clients/doctors/${r.id}`}
                            className="font-medium text-[var(--sidebar-blue)] hover:underline"
                          >
                            {r.name}
                          </Link>
                        </td>
                        <td className="py-1.5 pr-2">{clinicsText(r.clinicNames)}</td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {formatYmdRu(r.lastOrderOn)}
                        </td>
                        <td className="py-1.5 tabular-nums">{r.idleDays} дн.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </section>
  );
}
