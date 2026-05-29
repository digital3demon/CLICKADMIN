"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { MailEmailRow, MailFilter, MailFolder, MailLabel } from "@/components/mail/types";
import { mailFolderDisplayName } from "@/components/mail/types";
import { mailListDateLabel, mailPrimaryDateValue } from "@/components/mail/date-format";

function senderName(email: MailEmailRow): string {
  return email.direction === "OUTBOUND"
    ? "Вы"
    : email.fromName || email.fromAddress || "Без отправителя";
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

const AVATAR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];

function avatarColor(value: string): string {
  const hash = [...value].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function labelTextColor(bg: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(bg.trim());
  if (!match) return "#111827";
  const hex = match[1]!;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#111827" : "#ffffff";
}

function emailAttachmentCount(email: MailEmailRow): number {
  return email._count?.attachments ?? (email.hasAttachments ? 1 : 0);
}

function attachmentCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} вложение`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} вложения`;
  return `${count} вложений`;
}

function MailRow({
  email,
  active,
  selected,
  onOpen,
  onToggleSelect,
  onAction,
  onLabelClick,
  hoverPreviewEnabled,
  onPreviewMove,
  onPreviewLeave,
}: {
  email: MailEmailRow;
  active: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onAction: (action: "archive" | "trash" | "flag" | "unflag" | "read" | "unread") => void;
  onLabelClick: (labelId: string) => void;
  hoverPreviewEnabled: boolean;
  onPreviewMove: (email: MailEmailRow, event: MouseEvent<HTMLDivElement>) => void;
  onPreviewLeave: () => void;
}) {
  const sender = senderName(email);
  const labels = email.labelAssignments?.map((item) => item.label) ?? [];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `email:${email.id}`,
    data: { emailId: email.id },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`group relative flex min-h-[96px] cursor-pointer items-center gap-2 border-b-2 border-white/10 px-3 py-2 transition dark:border-white/10 ${
        active
          ? "bg-[var(--accent-selection-bg)]"
          : selected
            ? "bg-[var(--accent-selection-bg)]"
            : email.isRead
              ? "bg-[var(--card-bg)] hover:bg-[var(--surface-hover)]"
              : "bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)]"
      } ${isDragging ? "opacity-60 shadow-lg" : ""}`}
      onClick={onOpen}
      onMouseMove={(event) => {
        if (hoverPreviewEnabled) onPreviewMove(email, event);
      }}
      onMouseLeave={onPreviewLeave}
    >
      <div className="relative flex h-8 w-6 shrink-0 items-center justify-center">
        <button
          type="button"
          className={`absolute inset-0 flex items-center justify-center rounded-full transition ${
            selected
              ? "opacity-0"
              : email.isRead
                ? "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-blue)] group-hover:opacity-0"
                : "text-orange-500 hover:bg-orange-500/10 group-hover:opacity-0"
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
        <button
          type="button"
          className={`absolute inset-0 flex items-center justify-center rounded-full transition ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          aria-label="Выбрать письмо"
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => undefined}
            className="pointer-events-none h-4 w-4 rounded border-[var(--input-border)] text-[var(--sidebar-blue)]"
            tabIndex={-1}
          />
        </button>
      </div>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white shadow-sm"
        style={{ backgroundColor: avatarColor(email.fromAddress || sender) }}
        title="Перетащите письмо в папку"
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        {email.senderAvatarUrl ? (
          // Когда сервер начнёт отдавать аватар отправителя, строка письма уже покажет картинку.
          // Сейчас для обычных писем остаются цветные инициалы.
          <img src={email.senderAvatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          initials(sender) || "?"
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <div
              className={`truncate text-[15px] leading-5 ${
                email.isRead ? "font-medium text-[var(--text-body)]" : "font-bold text-[var(--app-text)]"
              }`}
            >
              {sender}
            </div>
            <div
              className={`mt-0.5 truncate text-sm leading-5 ${
                email.isRead ? "font-medium text-[var(--text-body)]" : "font-bold text-[var(--app-text)]"
              }`}
            >
              {email.subject || "(без темы)"}
            </div>
            <p className="mt-0.5 truncate text-sm leading-5 text-[var(--text-secondary)]">
              {email.preview || "Нет предпросмотра"}
            </p>
            {labels.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {labels.map((label) => {
                  const color = label.color || "#a78bfa";
                  return (
                    <button
                      key={label.id}
                      type="button"
                      className="max-w-[11rem] truncate rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 shadow-sm"
                      style={{ backgroundColor: color, color: labelTextColor(color) }}
                      title={`Показать письма с меткой «${label.name}»`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onLabelClick(label.id);
                      }}
                    >
                      {label.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
            <time className="text-xs font-medium text-[var(--text-muted)]">
              {mailListDateLabel(mailPrimaryDateValue(email))}
            </time>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`rounded-full px-1 text-lg leading-none transition ${
                  email.isFlagged
                    ? "text-yellow-400"
                    : "text-[var(--text-muted)] hover:text-yellow-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(email.isFlagged ? "unflag" : "flag");
                }}
                title="Флажок"
              >
                ★
              </button>
              {email.hasAttachments ? (
                <span className="text-lg leading-none text-[var(--text-muted)]" title="Есть вложения">
                  📎
                </span>
              ) : null}
            </div>
          </div>
        </div>
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
      {email.hasLinkedOrder ? (
        <span
          className="pointer-events-none absolute bottom-2 right-3 flex flex-col items-center gap-0.5"
          title="Из письма сформирован заказ"
          aria-label="Из письма сформирован заказ"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xl font-black leading-none text-zinc-500 shadow-sm ring-2 ring-[var(--card-bg)] dark:text-zinc-500">
            ✓
          </span>
          {email.linkedOrderNumber ? (
            <span className="max-w-16 truncate text-[10px] font-semibold leading-3 text-[var(--text-muted)]">
              {email.linkedOrderNumber}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function MailList({
  folder,
  label,
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
  onMarkAllRead,
  onBulkAction,
  onEmailAction,
  onLabelClick,
  canMarkAllRead,
  hoverPreviewEnabled,
}: {
  folder: MailFolder | null;
  label: MailLabel | null;
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
  onMarkAllRead: () => void;
  onBulkAction: (action: "read" | "unread" | "archive" | "trash" | "delete") => void;
  onEmailAction: (id: string, action: "archive" | "trash" | "flag" | "unflag" | "read" | "unread") => void;
  onLabelClick: (labelId: string) => void;
  canMarkAllRead: boolean;
  hoverPreviewEnabled: boolean;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ email: MailEmailRow; x: number; y: number } | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (emails[index]?.labelAssignments?.length ? 118 : 96),
    overscan: 10,
  });
  const selectedCount = selectedIds.size;
  const allSelected = useMemo(
    () => emails.length > 0 && emails.every((e) => selectedIds.has(e.id)),
    [emails, selectedIds],
  );
  const previewLeft = hoverPreview
    ? Math.max(8, Math.min(hoverPreview.x + 14, (typeof window === "undefined" ? 1200 : window.innerWidth) - 268))
    : 0;
  const previewTop = hoverPreview
    ? Math.max(8, Math.min(hoverPreview.y + 14, (typeof window === "undefined" ? 800 : window.innerHeight) - 140))
    : 0;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col border-r border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="border-b border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="min-w-0 text-xl font-semibold tracking-[-0.02em] text-[var(--app-text)]">
              {label ? label.name : folder ? mailFolderDisplayName(folder) : "Почта"}
              {(label?.unreadCount ?? folder?.unreadCount ?? 0) > 0 ? (
                <span className="ml-3 inline-flex min-w-7 items-center justify-center rounded-full bg-[var(--sidebar-blue)] px-2 py-0.5 align-middle text-xs font-semibold text-white">
                  {(label?.unreadCount ?? folder?.unreadCount ?? 0) > 99
                    ? "99+"
                    : (label?.unreadCount ?? folder?.unreadCount ?? 0)}
                </span>
              ) : null}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {label
                ? `${label.totalCount} писем с меткой, ${label.unreadCount} непрочитанных`
                : folder
                  ? `${folder.totalCount} писем, ${folder.unreadCount} непрочитанных`
                  : "Выберите папку или метку"}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {canMarkAllRead ? (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="rounded-xl border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
              >
                Отметить все прочитанными
              </button>
            ) : null}
            <button
              type="button"
              onClick={allSelected ? onClearSelection : onSelectAll}
              className="rounded-xl border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
            >
              {allSelected ? "Снять" : "Выбрать"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["all", "Все"],
            ["unread", "Непрочитанные"],
            ["attachments", "С вложениями"],
            ["flagged", "С флажком"],
            ["unflagged", "Без флажка"],
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
                      onLabelClick={onLabelClick}
                      hoverPreviewEnabled={hoverPreviewEnabled}
                      onPreviewMove={(nextEmail, event) => {
                        setHoverPreview({ email: nextEmail, x: event.clientX, y: event.clientY });
                      }}
                      onPreviewLeave={() => setHoverPreview(null)}
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
      {hoverPreviewEnabled && hoverPreview ? (
        <div
          className="pointer-events-none fixed z-50 w-64 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-xs text-[var(--text-body)] shadow-xl"
          style={{ left: previewLeft, top: previewTop }}
        >
          <p className="line-clamp-5 whitespace-pre-wrap leading-5">
            {hoverPreview.email.preview || "Нет текстового предпросмотра"}
          </p>
          <p className="mt-2 border-t border-[var(--card-border)] pt-2 text-[11px] font-semibold text-[var(--text-muted)]">
            {attachmentCountLabel(emailAttachmentCount(hoverPreview.email))}
          </p>
        </div>
      ) : null}
    </section>
  );
}
