"use client";

import { useMemo, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { MailEmailRow, MailFilter, MailFolder } from "@/components/mail/types";
import { mailFolderDisplayName } from "@/components/mail/types";

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
  const sum = [...value].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const mix = 22 + (sum % 28);
  return `color-mix(in srgb, var(--sidebar-blue) ${mix}%, var(--card-bg))`;
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
  onAction: (action: "archive" | "trash" | "flag" | "unflag" | "read" | "unread") => void;
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
      className={`group flex h-[86px] cursor-pointer items-center gap-3 border-b border-[var(--border-subtle)] px-4 transition ${
        active
          ? "bg-[var(--accent-selection-bg)]"
          : selected
            ? "bg-[var(--accent-selection-bg)]"
            : email.isRead
              ? "bg-[var(--card-bg)] hover:bg-[var(--surface-hover)]"
              : "bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)]"
      } ${isDragging ? "opacity-60 shadow-lg" : ""}`}
      onClick={onOpen}
    >
      <button
        type="button"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
          email.isRead
            ? "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-blue)]"
            : "text-orange-500 hover:bg-orange-500/10"
        }`}
        title={email.isRead ? "Пометить непрочитанным" : "Пометить прочитанным"}
        onClick={(e) => {
          e.stopPropagation();
          onAction(email.isRead ? "unread" : "read");
        }}
      >
        <span
          className={`block h-3.5 w-3.5 rounded-full ${
            email.isRead ? "border-2 border-current" : "bg-current shadow-[0_0_0_3px_rgba(249,115,22,0.14)]"
          }`}
          aria-hidden
        />
      </button>
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
          className="h-4 w-4 rounded border-[var(--input-border)] text-[var(--sidebar-blue)] opacity-0 transition group-hover:opacity-100 group-has-[:checked]:opacity-100"
          aria-label="Выбрать письмо"
        />
      </div>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[var(--text-strong)]"
        style={{ backgroundColor: avatarColor(sender) }}
        title="Перетащите письмо в папку"
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        {initials(sender) || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`min-w-[120px] max-w-[170px] truncate text-sm ${
              email.isRead ? "font-medium text-[var(--text-body)]" : "font-bold text-[var(--app-text)]"
            }`}
          >
            {sender}
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-sm ${
              email.isRead ? "font-medium text-[var(--text-body)]" : "font-bold text-[var(--app-text)]"
            }`}
          >
            {email.subject || "(без темы)"}
          </span>
          {email.hasAttachments ? <span title="Есть вложения">📎</span> : null}
          <button
            type="button"
            className={`rounded-full px-1 text-lg leading-none transition ${
              email.isFlagged ? "text-[var(--sidebar-blue)]" : "text-[var(--text-muted)] hover:text-[var(--sidebar-blue)]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onAction(email.isFlagged ? "unflag" : "flag");
            }}
            title="Флажок"
          >
            ★
          </button>
          <time className="w-16 shrink-0 text-right text-xs font-medium text-[var(--text-muted)]">
            {dateLabel(email.receivedAt || email.sentAt || email.createdAt)}
          </time>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-[var(--text-secondary)]">
          {email.preview || "Нет предпросмотра"}
        </p>
      </div>
      <div className="hidden shrink-0 gap-1 opacity-0 transition group-hover:flex group-hover:opacity-100">
        <button
          type="button"
          className="rounded-lg bg-[var(--card-bg)] px-2 py-1 text-xs text-[var(--text-body)] shadow-sm hover:bg-[var(--surface-hover)]"
          onClick={(e) => {
            e.stopPropagation();
            onAction("archive");
          }}
        >
          Архив
        </button>
        <button
          type="button"
          className="rounded-lg bg-[var(--card-bg)] px-2 py-1 text-xs text-red-600 shadow-sm hover:bg-red-500/10 dark:text-red-300"
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
  hasMore,
  loadingMore,
  onFilterChange,
  onLoadMore,
  onOpen,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onCreateOrder,
  onBulkAction,
  onEmailAction,
}: {
  folder: MailFolder | null;
  emails: MailEmailRow[];
  activeEmailId: string;
  selectedIds: Set<string>;
  filter: MailFilter;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onFilterChange: (filter: MailFilter) => void;
  onLoadMore: () => void;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onCreateOrder: () => void;
  onBulkAction: (action: "read" | "unread" | "archive" | "trash" | "delete") => void;
  onEmailAction: (id: string, action: "archive" | "trash" | "flag" | "unflag" | "read" | "unread") => void;
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
    <section className="flex min-w-0 flex-1 flex-col border-r border-[var(--card-border)] bg-[var(--card-bg)] xl:max-w-[520px]">
      <div className="border-b border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--app-text)]">
              {folder ? mailFolderDisplayName(folder) : "Почта"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {folder ? `${folder.totalCount} писем, ${folder.unreadCount} непрочитанных` : "Выберите папку"}
            </p>
          </div>
          <button
            type="button"
            onClick={allSelected ? onClearSelection : onSelectAll}
            className="rounded-xl border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
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
                  ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex items-center gap-2 border-b border-[var(--card-border)] bg-[var(--accent-selection-bg)] px-4 py-2 text-sm">
          <span className="mr-auto font-semibold text-[var(--sidebar-blue)]">Выбрано: {selectedCount}</span>
          <button className="rounded-lg bg-[var(--sidebar-blue)] px-3 py-1.5 font-semibold text-white hover:bg-[var(--sidebar-blue-hover)]" onClick={onCreateOrder}>
            Новый заказ
          </button>
          <button className="rounded-lg bg-[var(--card-bg)] px-3 py-1.5 hover:bg-[var(--surface-hover)]" onClick={() => onBulkAction("read")}>
            Прочитано
          </button>
          <button className="rounded-lg bg-[var(--card-bg)] px-3 py-1.5 hover:bg-[var(--surface-hover)]" onClick={() => onBulkAction("archive")}>
            Архив
          </button>
          <button className="rounded-lg bg-[var(--card-bg)] px-3 py-1.5 text-red-600 hover:bg-red-500/10 dark:text-red-300" onClick={() => onBulkAction("trash")}>
            Удалить
          </button>
        </div>
      ) : null}

      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 text-sm text-[var(--text-muted)]">Загрузка писем...</div>
        ) : emails.length === 0 ? (
          <div className="p-8 text-sm text-[var(--text-muted)]">В этой папке пока нет писем.</div>
        ) : (
          <>
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
            {hasMore ? (
              <div className="border-t border-[var(--card-border)] p-3">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)] disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingMore ? "Загружаем письма..." : "Загрузить ещё"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
