"use client";

import { useDroppable } from "@dnd-kit/core";
import type { MailAccount, MailFolder, MailLabel } from "@/components/mail/types";
import { mailFolderDisplayName } from "@/components/mail/types";

const FOLDER_ICONS: Record<string, string> = {
  INBOX: "⌂",
  SENT: "➤",
  DRAFTS: "✎",
  SPAM: "!",
  TRASH: "⌫",
  ARCHIVE: "▣",
  CUSTOM: "•",
};

function FolderButton({
  folder,
  active,
  onClick,
}: {
  folder: MailFolder;
  active: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${folder.id}` });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-[var(--accent-selection-bg)] font-semibold text-[var(--sidebar-blue)]"
          : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
      } ${isOver ? "ring-2 ring-[var(--sidebar-blue)]/30" : ""}`}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs text-white shadow-sm"
        style={{ backgroundColor: folder.color || "var(--card-bg)" }}
      >
        {FOLDER_ICONS[folder.type] ?? "•"}
      </span>
      <span className="min-w-0 flex-1 truncate">{mailFolderDisplayName(folder)}</span>
      {folder.unreadCount > 0 ? (
        <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--text-body)]">
          {folder.unreadCount > 99 ? "99+" : folder.unreadCount}
        </span>
      ) : null}
    </button>
  );
}

export function MailSidebar({
  account,
  activeFolderId,
  labels,
  onFolderChange,
  onCreateFolder,
  onCreateLabel,
}: {
  account: MailAccount | null;
  activeFolderId: string;
  labels: MailLabel[];
  onFolderChange: (folderId: string) => void;
  onCreateFolder: () => void;
  onCreateLabel: () => void;
}) {
  const folders = account?.folders ?? [];
  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-[var(--card-border)] bg-[var(--surface-muted)] px-4 py-4 lg:block">
      <nav className="space-y-1">
        {folders.map((folder) => (
          <FolderButton
            key={folder.id}
            folder={folder}
            active={folder.id === activeFolderId}
            onClick={() => onFolderChange(folder.id)}
          />
        ))}
      </nav>

      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between px-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Метки
          </h3>
          <button
            type="button"
            onClick={onCreateLabel}
            className="rounded-md px-1.5 text-lg leading-none text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-blue)]"
            title="Создать метку"
          >
            +
          </button>
        </div>
        <div className="space-y-1">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--text-body)]"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="min-w-0 flex-1 truncate">{label.name}</span>
              {label.unreadCount > 0 ? (
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{label.unreadCount}</span>
              ) : null}
            </div>
          ))}
          {labels.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--text-muted)]">Метки пока не созданы</p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <button
          type="button"
          onClick={onCreateFolder}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-body)] shadow-sm transition hover:bg-[var(--surface-hover)]"
        >
          Создать папку
        </button>
        <button
          type="button"
          onClick={onCreateLabel}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-body)] shadow-sm transition hover:bg-[var(--surface-hover)]"
        >
          Создать метку
        </button>
      </div>
    </aside>
  );
}
