"use client";

import { useMemo, useState } from "react";
import {
  ImageLightbox,
  type ImageLightboxState,
} from "@/components/ui/ImageLightbox";
import { WorkExampleMeshViewer } from "@/components/work-examples/WorkExampleMeshViewer";
import type { WorkExampleCompositionLine } from "@/components/work-examples/types";
import { isWorkExampleViewableMesh } from "@/lib/work-examples/mesh-file";

export type PublicShowcaseData = {
  labName: string;
  title?: string;
  cardTypes: Array<{ id: string; name: string }>;
  composition: WorkExampleCompositionLine[];
  cloudUrl: string | null;
  technicianNotes: string;
  doctorComments: string;
  files: Array<{
    id: string;
    kind: "PHOTO" | "CAD" | "FILE";
    fileName: string;
    mime: string;
    sizeBytes: number;
  }>;
};

function rub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PublicWorkExampleShowcase({
  tenantSlug,
  token,
  data,
}: {
  tenantSlug: string;
  token: string;
  data: PublicShowcaseData;
}) {
  const fileHref = (id: string) =>
    `/api/public/work-examples/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(token)}/files/${encodeURIComponent(id)}`;
  const photos = data.files.filter((f) => f.kind === "PHOTO");
  const other = data.files.filter((f) => f.kind !== "PHOTO");
  const [lightbox, setLightbox] = useState<ImageLightboxState | null>(null);
  const total = useMemo(
    () => data.composition.reduce((s, l) => s + l.lineTotalRub, 0),
    [data.composition],
  );

  return (
    <div className="min-h-screen bg-[#0f1419] text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Портфолио лаборатории
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
          {data.title?.trim() || data.labName}
        </h1>
        {data.title?.trim() ? (
          <p className="mt-1 text-sm text-zinc-500">{data.labName}</p>
        ) : null}
        {data.cardTypes.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.cardTypes.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300"
              >
                {t.name}
              </span>
            ))}
          </div>
        ) : null}

        {photos.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p, _, all) => (
              <button
                key={p.id}
                type="button"
                className="overflow-hidden rounded-2xl border border-white/10"
                onClick={() =>
                  setLightbox({
                    images: all.map((x) => ({
                      id: x.id,
                      fileName: x.fileName,
                      url: fileHref(x.id),
                    })),
                    index: all.findIndex((x) => x.id === p.id),
                  })
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileHref(p.id)} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        {data.cloudUrl ? (
          <p className="mt-8 text-sm">
            Облако:{" "}
            <a href={data.cloudUrl} className="text-sky-300 underline" target="_blank" rel="noreferrer">
              открыть папку
            </a>
          </p>
        ) : null}

        {meshFiles.length ? (
          <div className="mt-8">
            <WorkExampleMeshViewer
              meshes={meshFiles.map((f) => ({
                url: fileHref(f.id),
                fileName: f.fileName,
              }))}
            />
          </div>
        ) : null}

        {other.length ? (
          <ul className="mt-6 space-y-2 text-sm">
            {other.map((f) => (
              <li key={f.id}>
                <a href={fileHref(f.id)} className="text-sky-300 underline" download>
                  {f.fileName}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {data.composition.length ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
              Состав работы
            </h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {data.composition.map((line, i) => (
                  <tr key={`${line.name}-${i}`} className="border-t border-white/5">
                    <td className="py-2 pr-3">{line.name}</td>
                    <td className="py-2 pr-3 tabular-nums text-zinc-400">×{line.quantity}</td>
                    <td className="py-2 text-right tabular-nums">{rub(line.lineTotalRub)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/15">
                  <td className="pt-3 font-medium" colSpan={2}>
                    Итого
                  </td>
                  <td className="pt-3 text-right font-semibold tabular-nums">{rub(total)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        ) : null}

        {(data.technicianNotes || data.doctorComments) && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {data.technicianNotes ? (
              <blockquote className="rounded-2xl border border-white/10 p-4 text-sm text-zinc-300">
                {data.technicianNotes}
              </blockquote>
            ) : null}
            {data.doctorComments ? (
              <blockquote className="rounded-2xl border border-white/10 p-4 text-sm text-zinc-300">
                {data.doctorComments}
              </blockquote>
            ) : null}
          </div>
        )}
      </div>
      {lightbox ? (
        <ImageLightbox
          state={lightbox}
          showFileName={false}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox((s) => (s ? { ...s, index } : s))}
        />
      ) : null}
    </div>
  );
}
