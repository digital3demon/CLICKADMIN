"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_KEY = process.env.NEXT_PUBLIC_CLICKMIG_API_KEY ?? "";

function apiHeaders(): HeadersInit {
  const h: HeadersInit = {};
  if (API_KEY) h["x-clickmig-api-key"] = API_KEY;
  return h;
}

export default function ClickMigResubmitPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [data, setData] = useState<{
    publicNumber: string;
    blockedReason: string | null;
    blockedFields: string[];
    application: {
      clientNotes: string | null;
      photoLinks: string[];
      scanLinks: string[];
    };
  } | null>(null);
  const [clientNotes, setClientNotes] = useState("");
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/clickmig/public/resubmit/${token}`, {
      headers: apiHeaders(),
    });
    if (res.ok) {
      const j = (await res.json()) as typeof data;
      setData(j);
      setClientNotes(j?.application.clientNotes ?? "");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const fd = new FormData();
    if (data?.blockedFields.includes("clientNotes")) {
      fd.set("clientNotes", clientNotes);
    }
    const res = await fetch(`/api/clickmig/public/resubmit/${token}`, {
      method: "POST",
      headers: apiHeaders(),
      body: fd,
    });
    if (res.ok) setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-semibold">Данные отправлены</h1>
        <p className="mt-2 text-sm">Специалист проверит обновления.</p>
      </main>
    );
  }

  if (!data) {
    return <main className="p-6 text-sm">Загрузка…</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-semibold">Обновить данные · {data.publicNumber}</h1>
      {data.blockedReason && (
        <p className="rounded bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          {data.blockedReason}
        </p>
      )}
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        {data.blockedFields.includes("clientNotes") && (
          <textarea
            className="w-full rounded border p-2 text-sm"
            rows={4}
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            placeholder="Задание"
          />
        )}
        {data.blockedFields.includes("photos") && (
          <input type="file" accept="image/*" multiple name="photo" />
        )}
        {data.blockedFields.includes("scans") && (
          <input type="file" multiple name="scan" />
        )}
        <button type="submit" className="w-full rounded bg-blue-600 py-2 text-white">
          Отправить новые данные
        </button>
      </form>
    </main>
  );
}
