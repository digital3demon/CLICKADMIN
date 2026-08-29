"use client";

import { useRef } from "react";

export function WorkExampleDropZone({
  label,
  accept,
  onFiles,
}: {
  label: string;
  accept: string;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const take = (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list);
    if (files.length) onFiles(files);
  };

  return (
    <div
      className="mt-2 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-5 text-center text-sm text-[var(--text-muted)]"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        take(e.dataTransfer.files);
      }}
      onPaste={(e) => {
        const files: File[] = [];
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.kind === "file") {
            const f = item.getAsFile();
            if (f) files.push(f);
          }
        }
        if (files.length) {
          e.preventDefault();
          onFiles(files);
        }
      }}
      tabIndex={0}
    >
      <button
        type="button"
        className="font-medium text-[var(--sidebar-blue)] hover:underline"
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      <p className="mt-1 text-xs">или перетащите сюда, или Ctrl+V</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept={accept}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
