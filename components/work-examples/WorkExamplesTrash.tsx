"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  workExampleDisplayTitle,
  type WorkExampleItem,
} from "@/components/work-examples/types";

type TrashFile = {
  exampleId: string;
  orderNumber: string | null;
  file: { id: string; fileName: string; caption: string };
};

export function WorkExamplesTrash() {
  const [examples, setExamples] = useState<WorkExampleItem[]>([]);
  const [files, setFiles] = useState<TrashFile[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/work-examples/trash", { credentials: "include" });
    const j = (await r.json()) as { examples?: WorkExampleItem[]; files?: TrashFile[] };
    setExamples(j.examples ?? []);
    setFiles(j.files ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (body: Record<string, string>) => {
    await fetch("/api/work-examples/trash", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <Link href="/work-examples" className="text-sm text-[var(--sidebar-blue)] hover:underline">
        ← К примерам
      </Link>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Примеры работы</h2>
        <ul className="space-y-2">
          {examples.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm"
            >
              <span>
                {ex.deletedCaption || workExampleDisplayTitle(ex)}
              </span>
              <button
                type="button"
                className="text-[var(--sidebar-blue)]"
                onClick={() => void restore({ kind: "example", exampleId: ex.id })}
              >
                восстановить
              </button>
            </li>
          ))}
          {!examples.length ? (
            <li className="text-sm text-[var(--text-muted)]">Пусто</li>
          ) : null}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Файлы</h2>
        <ul className="space-y-2">
          {files.map((row) => (
            <li
              key={row.file.id}
              className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm"
            >
              <span>
                {row.file.caption}
                {row.orderNumber ? ` · ${row.orderNumber}` : ""}
              </span>
              <button
                type="button"
                className="text-[var(--sidebar-blue)]"
                onClick={() =>
                  void restore({
                    kind: "file",
                    exampleId: row.exampleId,
                    fileId: row.file.id,
                  })
                }
              >
                восстановить
              </button>
            </li>
          ))}
          {!files.length ? (
            <li className="text-sm text-[var(--text-muted)]">Пусто</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
