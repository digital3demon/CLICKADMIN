"use client";

import { useMemo, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { MailEmailRow, MailFilter, MailFolder } from "@/components/mail/types";

function senderName(email: MailEmailRow): string {
  return email.direction === "OUTBOUND"
    ? "Вы"
    : email.fromName || email.fromAddress || "Без отправителя";
}

function dateLabel(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarColor(value: string): string {
  const colors = ["#ffcc4d", "#8cc9ff", "#b8e986", "#ff9aa2", "#c8b6ff", "#9be7d8"];
  const sum = [...value].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[sum % colors.length]!;
}

function MailRow({
  email,
  active,
  selected,
  onOpen,
  onToggleSelect,
  onAction,
}: {
  email: MailEmailRow;
  active: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onAction: (action: "archive" | "trash" | "flag" | "unflag") => void;
}) {
  const sender = senderName(email);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `email:${email.id}`,
    data: { emailId: email.id },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`group flex h-[86px] cursor-pointer items-center gap-3 border-b border-[#edf0f6] px-4 transition ${
        active
          ? "bg-[#eaf2ff]"
          : selected
            ? "bg-[#f0f6ff]"
            : email.isRead
              ? "bg-white hover:bg-[#f6f8fc]"
              : "bg-[#fffef8] hover:bg-[#f8f9fd]"
      } ${isDragging ? "opacity-60 shadow-lg" : ""}`}
      onClick={onOpen}
      {...attributes}
      {...listeners}
    >
      <div
        className="flex h-full items-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => undefined}
          className="h-4 w-4 rounded border-[#c9d1df] text-[#2b7cff] opacity-0 transition group-hover:opacity-100 group-has-[:checked]:opacity-100"
          aria-label="Выбрать письмо"
        />
      </div>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#1d2430]"
        style={{ backgroundColor: avatarColor(sender) }}
      >
        {initials(sender) || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`min-w-[120px] max-w-[170px] truncate text-sm ${
              email.isRead ? "font-medium text-[#343a45]" : "font-bold text-[#11151b]"
            }`}
          >
            {sender}
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-sm ${
              email.isRead ? "font-medium text-[#2f3640]" : "font-bold text-[#11151b]"
            }`}
          >
            {email.subject || "(без темы)"}
          </span>
          {email.hasAttachments ? <span title="Есть вложения">📎</span> : null}
          <button
            type="button"
            className={`rounded-full px-1 text-lg leading-none transition ${
              email.isFlagged ? "text-[#ffb300]" : "text-[#c2c8d3] hover:text-[#ffb300]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onAction(email.isFlagged ? "unflag" : "flag");
            }}
            title="Флажок"
          >
            ★
          </button>
          <time className="w-16 shrink-0 text-right text-xs font-medium text-[#7f8796]">
            {dateLabel(email.receivedAt || email.sentAt || email.createdAt)}
          </time>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#6d7584]">
          {email.preview || "Нет предпросмотра"}
        </p>
      </div>
      <div className="hidden shrink-0 gap-1 opacity-0 transition group-hover:flex group-hover:opacity-100">
        <button
          type="button"
          className="rounded-lg bg-white px-2 py-1 text-xs text-[#4b5564] shadow-sm hover:bg-[#eef3fb]"
          onClick={(e) => {
            e.stopPropagation();
            onAction("archive");
          }}
        >
          Архив
        </button>
        <button
          type="button"
          className="rounded-lg bg-white px-2 py-1 text-xs text-[#c23232] shadow-sm hover:bg-[#fff0f0]"
          onClick={(e) => {
            e.stopPropagation();
            onAction("trash");
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}

export function MailList({
  folder,
  emails,
  activeEmailId,
  selectedIds,
  filter,
  loading,
  onFilterChange,
  onOpen,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onBulkAction,
  onEmailAction,
}: {
  folder: MailFolder | null;
  emails: MailEmailRow[];
  activeEmailId: string;
  selectedIds: Set<string>;
  filter: MailFilter;
  loading: boolean;
  onFilterChange: (filter: MailFilter) => void;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkAction: (action: "read" | "unread" | "archive" | "trash" | "delete") => void;
  onEmailAction: (id: string, action: "archive" | "trash" | "flag" | "unflag") => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 86,
    overscan: 10,
  });
  const selectedCount = selectedIds.size;
  const allSelected = useMemo(
    () => emails.length > 0 && emails.every((e) => selectedIds.has(e.id)),
    [emails, selectedIds],
  );

  return (
    <section className="flex min-w-0 flex-1 flex-col border-r border-[#e4e8f0] bg-white xl:max-w-[520px]">
      <div className="border-b border-[#e9edf4] bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#15191f]">
              {folder?.displayName || "Почта"}
            </h2>
            <p className="mt-0.5 text-xs text-[#858e9f]">
              {folder ? `${folder.totalCount} писем, ${folder.unreadCount} непрочитанных` : "Выберите папку"}
            </p>
          </div>
          <button
            type="button"
            onClick={allSelected ? onClearSelection : onSelectAll}
            className="rounded-xl border border-[#dfe4ee] px-3 py-1.5 text-xs font-medium text-[#4a5260] hover:bg-[#f3f6fb]"
          >
            {allSelected ? "Снять" : "Выбрать"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["all", "Все"],
            ["unread", "Непрочитанные"],
            ["attachments", "С вложениями"],
            ["flagged", "С флажком"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value as MailFilter)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === value
                  ? "bg-[#2b7cff] text-white shadow-sm"
                  : "bg-[#f1f4f8] text-[#596273] hover:bg-[#e8edf6]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex items-center gap-2 border-b border-[#dce5f3] bg-[#edf5ff] px-4 py-2 text-sm">
          <span className="mr-auto font-semibold text-[#1d4f9c]">Выбрано: {selectedCount}</span>
          <button className="rounded-lg bg-white px-3 py-1.5 hover:bg-[#f7fbff]" onClick={() => onBulkAction("read")}>
            Прочитано
          </button>
          <button className="rounded-lg bg-white px-3 py-1.5 hover:bg-[#f7fbff]" onClick={() => onBulkAction("archive")}>
            Архив
          </button>
          <button className="rounded-lg bg-white px-3 py-1.5 text-[#c23232] hover:bg-[#fff7f7]" onClick={() => onBulkAction("trash")}>
            Удалить
          </button>
        </div>
      ) : null}

      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 text-sm text-[#7f8796]">Загрузка писем...</div>
        ) : emails.length === 0 ? (
          <div className="p-8 text-sm text-[#7f8796]">В этой папке пока нет писем.</div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const email = emails[virtualRow.index]!;
              return (
                <div
                  key={email.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <MailRow
                    email={email}
                    active={email.id === activeEmailId}
                    selected={selectedIds.has(email.id)}
                    onOpen={() => onOpen(email.id)}
                    onToggleSelect={() => onToggleSelect(email.id)}
                    onAction={(action) => onEmailAction(email.id, action)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
