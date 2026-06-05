"use client";

import { StickerTemplateEditor } from "@/components/directory/StickerTemplateEditor";

export function PrintTenantSettings({ canEdit }: { canEdit: boolean }) {
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
      <StickerTemplateEditor canEdit={canEdit} />
    </div>
  );
}
