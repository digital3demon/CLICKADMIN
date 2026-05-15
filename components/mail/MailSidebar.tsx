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
  collapsed,
  onClick,
}: {
  folder: MailFolder;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${folder.id}` });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      title={mailFolderDisplayName(folder)}
      className={`group flex w-full items-center rounded-xl text-left text-sm transition ${
        active
          ? "bg-[var(--accent-selection-bg)] font-semibold text-[var(--sidebar-blue)]"
          : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
      } ${collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"} ${isOver ? "ring-2 ring-[var(--sidebar-blue)]/30" : ""}`}
    >
      <span
        className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs text-white shadow-sm"
        style={{ backgroundColor: folder.color || "var(--card-bg)" }}
      >
        {FOLDER_ICONS[folder.type] ?? "•"}
        {collapsed && folder.unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-[var(--surface-muted)]" />
        ) : null}
      </span>
      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{mailFolderDisplayName(folder)}</span>}
      {!collapsed && folder.unreadCount > 0 ? (
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
  collapsed,
  onCollapsedChange,
  onFolderChange,
  onCreateFolder,
  onCreateLabel,
}: {
  account: MailAccount | null;
  activeFolderId: string;
  labels: MailLabel[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onFolderChange: (folderId: string) => void;
  onCreateFolder: () => void;
  onCreateLabel: () => void;
}) {
  const folders = account?.folders ?? [];
  return (
    <aside
      className={`hidden shrink-0 border-r border-[var(--card-border)] bg-[var(--surface-muted)] py-4 transition-[width] duration-200 lg:block ${
        collapsed ? "w-[72px] px-2" : "w-[280px] px-4"
      }`}
    >
      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className={`mb-3 flex h-9 items-center rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium text-[var(--text-body)] shadow-sm transition hover:bg-[var(--surface-hover)] ${
          collapsed ? "w-full justify-center" : "w-full justify-between px-3"
        }`}
        title={collapsed ? "Развернуть папки" : "Свернуть папки"}
        aria-label={collapsed ? "Развернуть папки" : "Свернуть папки"}
      >
        {collapsed ? "›" : (
          <>
            <span>Папки</span>
            <span aria-hidden>‹</span>
          </>
        )}
      </button>
      <nav className="space-y-1">
        {folders.map((folder) => (
          <FolderButton
            key={folder.id}
            folder={folder}
            active={folder.id === activeFolderId}
            collapsed={collapsed}
            onClick={() => onFolderChange(folder.id)}
          />
        ))}
      </nav>

      {collapsed ? null : <div className="mt-7">
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
      </div>}

      {collapsed ? null : <div className="mt-auto space-y-2 pt-6">
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
      </div>}
    </aside>
  );
}
