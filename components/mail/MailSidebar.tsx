"use client";

import { useState } from "react";
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

const SYSTEM_FOLDER_TYPES: MailFolder["type"][] = [
  "INBOX",
  "SENT",
  "DRAFTS",
  "ARCHIVE",
  "SPAM",
  "TRASH",
];

const SEEDED_SYSTEM_IMAP_NAMES: Partial<Record<MailFolder["type"], string>> = {
  INBOX: "INBOX",
  SENT: "Sent",
  DRAFTS: "Drafts",
  ARCHIVE: "Archive",
  SPAM: "Spam",
  TRASH: "Trash",
};

function folderScore(folder: MailFolder, activeFolderId: string): number {
  const seededName = SEEDED_SYSTEM_IMAP_NAMES[folder.type];
  return (
    (folder.id === activeFolderId ? 10_000 : 0) +
    (seededName && folder.imapName !== seededName ? 1_000 : 0) +
    (folder.unreadCount > 0 ? 100 : 0) +
    (folder.totalCount > 0 ? 10 : 0)
  );
}

function visibleSystemFolders(folders: MailFolder[], activeFolderId: string): MailFolder[] {
  return SYSTEM_FOLDER_TYPES.flatMap((type) => {
    const sameType = folders.filter((folder) => folder.type === type);
    if (!sameType.length) return [];
    return sameType.slice().sort((a, b) => folderScore(b, activeFolderId) - folderScore(a, activeFolderId))[0];
  });
}

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
  const hasUnread = folder.unreadCount > 0;
  const hasMessages = folder.totalCount > 0;
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
        {collapsed && hasUnread ? (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-[var(--surface-muted)]" />
        ) : null}
      </span>
      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{mailFolderDisplayName(folder)}</span>}
      {!collapsed && hasMessages ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
            hasUnread
              ? "bg-[var(--sidebar-blue)] text-white"
              : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
          }`}
          title={hasUnread ? `${folder.unreadCount} непрочитанных из ${folder.totalCount}` : `${folder.totalCount} писем`}
        >
          {folder.totalCount > 999 ? "999+" : folder.totalCount}
        </span>
      ) : null}
    </button>
  );
}

export function MailSidebar({
  account,
  activeFolderId,
  activeLabelId,
  labels,
  unreadCount,
  collapsed,
  onCollapsedChange,
  onFolderChange,
  onLabelChange,
  onCreateFolder,
  onCreateLabel,
}: {
  account: MailAccount | null;
  activeFolderId: string;
  activeLabelId: string;
  labels: MailLabel[];
  unreadCount: number;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onFolderChange: (folderId: string) => void;
  onLabelChange: (labelId: string) => void;
  onCreateFolder: () => void;
  onCreateLabel: () => void;
}) {
  const folders = account?.folders ?? [];
  const systemFolders = visibleSystemFolders(folders, activeFolderId);
  const customFolders = folders.filter((folder) => folder.type === "CUSTOM");
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [labelsOpen, setLabelsOpen] = useState(true);
  return (
    <aside
      className={`hidden min-h-0 shrink-0 overflow-y-auto border-r border-[var(--card-border)] bg-[var(--surface-muted)] py-4 transition-[width] duration-200 lg:block ${
        collapsed ? "w-[72px] px-2" : "w-[280px] px-4"
      }`}
    >
      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className={`mb-3 flex h-9 items-center rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium text-[var(--text-body)] shadow-sm transition hover:bg-[var(--surface-hover)] ${
          collapsed ? "w-full justify-center" : "w-full justify-between px-3"
        }`}
        title={collapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"}
        aria-label={collapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"}
      >
        {collapsed ? (
          <span className="relative">
            ›
            {unreadCount > 0 ? (
              <span className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-[var(--card-bg)]" />
            ) : null}
          </span>
        ) : (
          <>
            <span>Почта</span>
            {unreadCount > 0 ? (
              <span className="ml-auto mr-2 rounded-full bg-[var(--sidebar-blue)] px-2 py-0.5 text-xs font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
            <span aria-hidden>‹</span>
          </>
        )}
      </button>

      {collapsed ? (
        <nav className="space-y-1">
          {[...systemFolders, ...customFolders].map((folder) => (
            <FolderButton
              key={folder.id}
              folder={folder}
              active={folder.id === activeFolderId}
              collapsed={collapsed}
              onClick={() => onFolderChange(folder.id)}
            />
          ))}
        </nav>
      ) : (
        <div>
          <nav className="space-y-1">
            {systemFolders.map((folder) => (
              <FolderButton
                key={folder.id}
                folder={folder}
                active={folder.id === activeFolderId}
                collapsed={collapsed}
                onClick={() => onFolderChange(folder.id)}
              />
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setFoldersOpen((open) => !open)}
            className="mb-2 mt-4 flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-body)]"
            aria-expanded={foldersOpen}
          >
            <span>Папки</span>
            <span className="text-base leading-none" aria-hidden>
              {foldersOpen ? "⌄" : "›"}
            </span>
          </button>
          {foldersOpen ? (
            <nav className="space-y-1">
              {customFolders.map((folder) => (
                <FolderButton
                  key={folder.id}
                  folder={folder}
                  active={folder.id === activeFolderId}
                  collapsed={collapsed}
                  onClick={() => onFolderChange(folder.id)}
                />
              ))}
              {customFolders.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[var(--text-muted)]">Пользовательские папки пока не созданы</p>
              ) : null}
            </nav>
          ) : null}
        </div>
      )}

      {collapsed ? null : <div className="mt-7">
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <button
            type="button"
            onClick={() => setLabelsOpen((open) => !open)}
            className="flex min-w-0 flex-1 items-center justify-between rounded-lg py-1 pr-1 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] transition hover:text-[var(--text-body)]"
            aria-expanded={labelsOpen}
          >
            <span>Метки</span>
            <span className="text-base leading-none" aria-hidden>
              {labelsOpen ? "⌄" : "›"}
            </span>
          </button>
          <button
            type="button"
            onClick={onCreateLabel}
            className="rounded-md px-1.5 text-lg leading-none text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-blue)]"
            title="Создать метку"
          >
            +
          </button>
        </div>
        {labelsOpen ? <div className="space-y-1">
          {labels.map((label) => (
            <button
              key={label.id}
              type="button"
              onClick={() => onLabelChange(label.id)}
              title={label.name}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                label.id === activeLabelId
                  ? "bg-[var(--accent-selection-bg)] font-semibold text-[var(--sidebar-blue)]"
                  : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="min-w-0 flex-1 truncate">{label.name}</span>
              {label.totalCount > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    label.unreadCount > 0
                      ? "bg-[var(--sidebar-blue)] text-white"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                  }`}
                  title={
                    label.unreadCount > 0
                      ? `${label.unreadCount} непрочитанных из ${label.totalCount}`
                      : `${label.totalCount} писем`
                  }
                >
                  {label.totalCount > 999 ? "999+" : label.totalCount}
                </span>
              ) : null}
            </button>
          ))}
          {labels.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--text-muted)]">Метки пока не созданы</p>
          ) : null}
        </div> : null}
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
