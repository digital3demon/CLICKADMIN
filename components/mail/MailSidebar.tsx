"use client";

import { useDroppable } from "@dnd-kit/core";
import type { MailAccount, MailFolder, MailLabel } from "@/components/mail/types";

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
          ? "bg-[#e8f1ff] font-semibold text-[#1b66d1]"
          : "text-[#2b3038] hover:bg-[#eef2f8]"
      } ${isOver ? "ring-2 ring-[#2b7cff]/30" : ""}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/70 text-xs text-[#7b8496] shadow-sm">
        {FOLDER_ICONS[folder.type] ?? "•"}
      </span>
      <span className="min-w-0 flex-1 truncate">{folder.displayName}</span>
      {folder.unreadCount > 0 ? (
        <span className="rounded-full bg-[#e7edf7] px-2 py-0.5 text-xs font-semibold text-[#4b5568]">
          {folder.unreadCount > 99 ? "99+" : folder.unreadCount}
        </span>
      ) : null}
    </button>
  );
}

export function MailSidebar({
  account,
  accounts,
  activeFolderId,
  labels,
  onFolderChange,
  onCreateFolder,
  onCreateLabel,
  onAccountClick,
}: {
  account: MailAccount | null;
  accounts: MailAccount[];
  activeFolderId: string;
  labels: MailLabel[];
  onFolderChange: (folderId: string) => void;
  onCreateFolder: () => void;
  onCreateLabel: () => void;
  onAccountClick: () => void;
}) {
  const folders = account?.folders ?? [];
  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-[#e4e8f0] bg-[#f6f7fb] px-4 py-4 lg:block">
      <button
        type="button"
        onClick={onAccountClick}
        className="mb-4 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-[#e2e7f0] transition hover:bg-[#fbfcff]"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[#20242b]">
            {account?.displayName || account?.email || "Почта Яндекса"}
          </span>
          <span className="block truncate text-xs text-[#7a8292]">
            {accounts.length > 1 ? `${accounts.length} аккаунта` : account?.email || "App Password"}
          </span>
        </span>
        <span className="text-[#8a92a3]">⌄</span>
      </button>

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
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b93a4]">
            Метки
          </h3>
          <button
            type="button"
            onClick={onCreateLabel}
            className="rounded-md px-1.5 text-lg leading-none text-[#8791a3] hover:bg-[#edf1f7] hover:text-[#2b7cff]"
            title="Создать метку"
          >
            +
          </button>
        </div>
        <div className="space-y-1">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#303640]"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="min-w-0 flex-1 truncate">{label.name}</span>
              {label.unreadCount > 0 ? (
                <span className="text-xs font-semibold text-[#6a7280]">{label.unreadCount}</span>
              ) : null}
            </div>
          ))}
          {labels.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#8a93a3]">Метки пока не созданы</p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <button
          type="button"
          onClick={onCreateFolder}
          className="w-full rounded-xl border border-[#dfe4ee] bg-white px-3 py-2 text-sm font-medium text-[#323842] shadow-sm transition hover:bg-[#f0f4fa]"
        >
          Создать папку
        </button>
        <button
          type="button"
          onClick={onCreateLabel}
          className="w-full rounded-xl border border-[#dfe4ee] bg-white px-3 py-2 text-sm font-medium text-[#323842] shadow-sm transition hover:bg-[#f0f4fa]"
        >
          Создать метку
        </button>
      </div>
    </aside>
  );
}
