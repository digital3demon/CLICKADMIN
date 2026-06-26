"use client";

import { useState } from "react";
import { StickerPublicHubTimelineEditor } from "@/components/directory/StickerPublicHubTimelineEditor";
import { StickerTemplateEditor } from "@/components/directory/StickerTemplateEditor";

type TabId = "label" | "qr";

export function PrintTenantSettings({ canEdit }: { canEdit: boolean }) {
  const [tab, setTab] = useState<TabId>("label");

  return (
    <div className="space-y-4">
      {!canEdit ? (
        <p className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          Режим просмотра. Сохранение шаблонов доступно при включённом модуле «Конфиг:
          редактирование этикеток» в{" "}
          <a href="/directory/access" className="text-[var(--sidebar-blue)] hover:underline">
            доступе по ролям
          </a>
          .
        </p>
      ) : null}

      <div
        className="flex gap-1 border-b border-[var(--card-border)]"
        role="tablist"
        aria-label="Разделы печати"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "label"}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "label"
              ? "border-[var(--sidebar-blue)] text-[var(--sidebar-blue)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--app-text)]"
          }`}
          onClick={() => setTab("label")}
        >
          Этикетка
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "qr"}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "qr"
              ? "border-[var(--sidebar-blue)] text-[var(--sidebar-blue)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--app-text)]"
          }`}
          onClick={() => setTab("qr")}
        >
          Страница по QR
        </button>
      </div>

      {tab === "label" ? (
        <StickerTemplateEditor canEdit={canEdit} />
      ) : (
        <StickerPublicHubTimelineEditor canEdit={canEdit} />
      )}
    </div>
  );
}
