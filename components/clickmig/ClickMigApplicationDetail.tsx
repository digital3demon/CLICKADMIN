"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClickMigScanViewer } from "./ClickMigScanViewer";

type AppDetail = {
  id: string;
  publicNumber: string;
  patientName: string;
  guestDoctorName: string | null;
  guestEmail: string | null;
  materialLabel: string;
  constructionName: string;
  clientNotes: string | null;
  teethFdi: string[];
  files: { id: string; kind: string; fileName: string; url: string }[];
};

export function ClickMigApplicationDetail({ id }: { id: string }) {
  const router = useRouter();
  const [app, setApp] = useState<AppDetail | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clickmig/applications/${id}`);
    const data = (await res.json()) as { application?: AppDetail };
    setApp(data.application ?? null);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept() {
    setBusy(true);
    await fetch(`/api/clickmig/applications/${id}/accept`, { method: "POST" });
    setBusy(false);
    router.push("/clickmig?tab=orders");
    router.refresh();
  }

  async function reject() {
    if (!rejectReason.trim()) return;
    setBusy(true);
    await fetch(`/api/clickmig/applications/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setBusy(false);
    router.push("/clickmig");
    router.refresh();
  }

  if (!app) return <p className="text-sm text-[var(--muted)]">Загрузка…</p>;

  const scanUrls = app.files
    .filter((f) => f.kind === "SCAN" && /\.(stl|ply|obj)$/i.test(f.fileName))
    .map((f) => f.url);

  const photos = app.files.filter((f) => f.kind === "PHOTO");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{app.publicNumber}</h2>
        <p className="text-sm text-[var(--muted)]">
          {app.guestDoctorName} · {app.guestEmail}
        </p>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--muted)]">Пациент</dt>
          <dd>{app.patientName}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Конструкция</dt>
          <dd>{app.constructionName}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Материал</dt>
          <dd>{app.materialLabel}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Зубы</dt>
          <dd>{app.teethFdi.join(", ")}</dd>
        </div>
      </dl>

      {app.clientNotes && (
        <div>
          <h3 className="text-sm font-medium">Задание</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm">{app.clientNotes}</p>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Фото</h3>
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.fileName}
                  className="h-24 w-24 rounded object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium">3D preview</h3>
        <ClickMigScanViewer meshUrls={scanUrls} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => void accept()}
        >
          Принять заказ
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg border border-red-500 px-4 py-2 text-sm text-red-600"
          onClick={() => setRejectOpen(true)}
        >
          Отказать
        </button>
      </div>

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--card-bg)] p-4">
            <h3 className="font-semibold">Причина отказа</h3>
            <textarea
              className="mt-2 w-full rounded border p-2 text-sm"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setRejectOpen(false)}>
                Отмена
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
                onClick={() => void reject()}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
