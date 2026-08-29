"use client";

import { useEffect, useState } from "react";
import { WorkExampleDropZone } from "@/components/work-examples/WorkExampleDropZone";
import type { WorkExampleCardType, WorkExampleItem } from "@/components/work-examples/types";

type OrderHit = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string;
};

export function WorkExampleEditorModal({
  item,
  onClose,
  onSaved,
}: {
  item: WorkExampleItem | null;
  onClose: () => void;
  onSaved: (next: WorkExampleItem) => void;
}) {
  const isEdit = Boolean(item);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<OrderHit[]>([]);
  const [orderId, setOrderId] = useState(item?.orderId ?? "");
  const [orderLabel, setOrderLabel] = useState(
    item?.orderNumber || (item && !item.orderId ? "не распределен" : ""),
  );
  const [cardTypes, setCardTypes] = useState<WorkExampleCardType[]>(item?.cardTypes ?? []);
  const [allTypes, setAllTypes] = useState<WorkExampleCardType[]>([]);
  const [typesOpen, setTypesOpen] = useState(false);
  const [cloudUrl, setCloudUrl] = useState(item?.cloudUrl ?? "");
  const [tech, setTech] = useState(item?.technicianNotes ?? "");
  const [doc, setDoc] = useState(item?.doctorComments ?? "");
  const [openKind, setOpenKind] = useState<"PHOTO" | "CAD" | "FILE" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/work-examples/card-types", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { items?: WorkExampleCardType[] }) => setAllTypes(j.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/work-examples/order-search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((j: { items?: OrderHit[] }) => setHits(j.items ?? []))
        .catch(() => setHits([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const pickOrder = async (hit: OrderHit | null) => {
    if (!hit) {
      setOrderId("");
      setOrderLabel("не распределен");
      setHits([]);
      return;
    }
    setOrderId(hit.id);
    setOrderLabel(hit.orderNumber);
    setHits([]);
    setQ("");
    const r = await fetch(
      `/api/work-examples/order-preview?orderId=${encodeURIComponent(hit.id)}`,
      { credentials: "include" },
    );
    const j = (await r.json()) as { cardTypes?: WorkExampleCardType[] };
    if (r.ok && j.cardTypes?.length && !cardTypes.length) {
      setCardTypes(j.cardTypes);
    }
  };

  const persistMeta = async (): Promise<WorkExampleItem | null> => {
    const body = {
      orderId: orderId || null,
      cardTypes,
      cloudUrl,
      technicianNotes: tech,
      doctorComments: doc,
    };
    const r = await fetch(item ? `/api/work-examples/${item.id}` : "/api/work-examples", {
      method: item ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json()) as { item?: WorkExampleItem; error?: string };
    if (!r.ok || !j.item) {
      setErr(j.error || "Не удалось сохранить");
      return null;
    }
    return j.item;
  };

  const upload = async (kind: "PHOTO" | "CAD" | "FILE", files: File[]) => {
    setBusy(true);
    setErr(null);
    try {
      let current = item;
      if (!current) {
        if (!window.confirm("Сначала сохранить пример и загрузить файлы?")) {
          setBusy(false);
          return;
        }
        current = await persistMeta();
        if (!current) {
          setBusy(false);
          return;
        }
        onSaved(current);
      }
      const fd = new FormData();
      fd.set("kind", kind);
      for (const f of files) fd.append("files", f);
      const r = await fetch(`/api/work-examples/${current.id}/files`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = (await r.json()) as { item?: WorkExampleItem; error?: string };
      if (!r.ok || !j.item) {
        setErr(j.error || "Не удалось загрузить");
        return;
      }
      onSaved(j.item);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!window.confirm("Сохранить изменения в примере работы?")) return;
    setBusy(true);
    setErr(null);
    try {
      const next = await persistMeta();
      if (next) {
        onSaved(next);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      role="dialog"
      aria-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            {isEdit ? "Изменить пример" : "Новый пример работы"}
          </h2>
          <button type="button" className="text-sm text-[var(--text-muted)]" onClick={onClose}>
            Закрыть
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Выберите работу
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
                placeholder="Поиск наряда…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Сейчас: {orderLabel || "не распределен"}
                {orderId ? (
                  <button
                    type="button"
                    className="ml-2 text-[var(--sidebar-blue)]"
                    onClick={() => void pickOrder(null)}
                  >
                    снять
                  </button>
                ) : null}
              </p>
              {hits.length > 0 ? (
                <ul className="mt-1 max-h-40 overflow-auto rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-sm">
                  {hits.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-[var(--surface-hover)]"
                        onClick={() => void pickOrder(h)}
                      >
                        <span className="font-mono font-semibold">{h.orderNumber}</span>
                        {h.patientName ? ` · ${h.patientName}` : ""}
                        {h.doctorName ? ` · ${h.doctorName}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="w-full sm:w-56">
              <button
                type="button"
                className="w-full rounded-lg border border-[var(--card-border)] px-3 py-2 text-left text-sm"
                onClick={() => setTypesOpen((v) => !v)}
              >
                Типы работ
                <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                  {cardTypes.map((t) => t.name).join(", ") || "не заданы"}
                </span>
              </button>
              {typesOpen ? (
                <ul className="mt-1 max-h-48 overflow-auto rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-2 text-sm">
                  {allTypes.map((t) => {
                    const on = cardTypes.some((x) => x.id === t.id);
                    return (
                      <li key={t.id}>
                        <label className="flex cursor-pointer items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setCardTypes((prev) =>
                                on ? prev.filter((x) => x.id !== t.id) : [...prev, t],
                              )
                            }
                          />
                          {t.name}
                        </label>
                      </li>
                    );
                  })}
                  {!allTypes.length ? (
                    <li className="text-xs text-[var(--text-muted)]">Типы канбана пусты</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Прикрепите ссылку
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
              placeholder="https://…"
              value={cloudUrl}
              onChange={(e) => setCloudUrl(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["PHOTO", "+ фото"],
                ["CAD", "+ проект кад"],
                ["FILE", "+ файлы"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-hover)]"
                onClick={() => setOpenKind((v) => (v === k ? null : k))}
              >
                {label}
              </button>
            ))}
          </div>
          {openKind === "PHOTO" ? (
            <WorkExampleDropZone
              label="Загрузить фото"
              accept="image/*"
              onFiles={(files) => void upload("PHOTO", files)}
            />
          ) : null}
          {openKind === "CAD" ? (
            <WorkExampleDropZone
              label="Загрузить проект КАД"
              accept=".stl,.ply,.obj,.3mf,.zip,.drc"
              onFiles={(files) => void upload("CAD", files)}
            />
          ) : null}
          {openKind === "FILE" ? (
            <WorkExampleDropZone
              label="Загрузить файлы"
              accept="*"
              onFiles={(files) => void upload("FILE", files)}
            />
          ) : null}

          {item?.files.length ? (
            <p className="text-xs text-[var(--text-muted)]">
              Уже в примере: {item.files.map((f) => f.fileName).join(", ")}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Описание от техника
              </span>
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2"
                value={tech}
                onChange={(e) => setTech(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Комментарии от доктора
              </span>
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2"
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
              />
            </label>
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-[var(--card-border)] px-4 py-3">
          <button type="button" className="rounded-lg px-3 py-1.5 text-sm" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-[var(--sidebar-blue)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => void save()}
          >
            Сохранить
          </button>
        </footer>
      </div>
    </div>
  );
}
