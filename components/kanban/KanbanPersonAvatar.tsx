"use client";

import { useState } from "react";
import type { KanbanBoard, KanbanUser } from "@/lib/kanban/types";
import {
  initialsFromDisplayName,
  kanbanFallbackAccentFromId,
} from "@/lib/kanban/kanban-person-display";
import { profileAvatarEmoji } from "@/lib/profile-avatar-presets";
import type { KanbanCrmUserRow } from "./kanban-crm-users-context";
import { useKanbanCrmUsers } from "./kanban-crm-users-context";

const sizeClass = {
  xs: "h-[18px] w-[18px] text-[0.5rem]",
  sm: "h-6 w-6 text-[0.55rem]",
  card: "h-[26px] w-[26px] text-[0.65rem] max-md:h-[18px] max-md:w-[18px] max-md:text-[0.5rem]",
  md: "h-9 w-9 text-[0.65rem]",
  picker: "h-7 w-7 text-[0.6rem]",
} as const;

type SizeKey = keyof typeof sizeClass;

type KanbanPersonAvatarProps = {
  userId: string;
  homeBoard: KanbanBoard;
  variant: "assignee" | "participant";
  size: SizeKey;
  className?: string;
  titleSuffix?: string;
};

export function KanbanPersonAvatar({
  userId,
  homeBoard,
  variant,
  size,
  className = "",
  titleSuffix,
}: KanbanPersonAvatarProps) {
  const [customPhotoFailed, setCustomPhotoFailed] = useState(false);
  const { byId } = useKanbanCrmUsers();
  const crm = byId.get(userId);
  const legacy = homeBoard.users.find((x) => x.id === userId);

  const displayName = crm?.displayName ?? legacy?.name ?? "Пользователь";
  const initials =
    legacy?.initials ??
    initialsFromDisplayName(crm?.displayName ?? crm?.email ?? displayName);
  const ring =
    variant === "assignee"
      ? size === "card"
        ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--kanban-card-bg)] max-md:ring-1 max-md:ring-offset-1"
        : size === "sm"
          ? "ring-1 ring-amber-500/80 ring-offset-1 ring-offset-[var(--kanban-card-bg)]"
          : "ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--kaiten-modal-bg)]"
      : size === "card"
        ? "border-2 border-dashed border-[var(--kanban-text-muted)] max-md:border"
        : "border-2 border-dashed border-[var(--kaiten-modal-muted)]";

  const base = `${sizeClass[size]} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${ring} ${className}`.trim();

  const title =
    titleSuffix != null
      ? `${displayName}${titleSuffix}`
      : `${displayName}${variant === "assignee" ? " (ответственный)" : " (участник)"}`;

  if (crm?.avatarCustomUploadedAt && !customPhotoFailed) {
    const v = String(new Date(crm.avatarCustomUploadedAt).getTime() || 0);
    const src = `/api/user-avatars/${encodeURIComponent(userId)}?v=${encodeURIComponent(v)}`;
    return (
      <span title={title} className={`${base} overflow-hidden bg-zinc-700 p-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={displayName}
          className="h-full w-full object-cover"
          onError={() => setCustomPhotoFailed(true)}
        />
      </span>
    );
  }

  if (crm && (crm.avatarPresetId || "").trim()) {
    const emoji = profileAvatarEmoji(crm.avatarPresetId);
    const bg = kanbanFallbackAccentFromId(userId);
    return (
      <span title={title} className={base} style={{ background: bg }}>
        <span className="select-none leading-none" aria-hidden>
          {emoji}
        </span>
      </span>
    );
  }

  if (legacy) {
    return (
      <span title={title} className={base} style={{ background: legacy.color }}>
        {initials}
      </span>
    );
  }

  if (crm) {
    const bg = kanbanFallbackAccentFromId(userId);
    return (
      <span title={title} className={base} style={{ background: bg }}>
        {initials}
      </span>
    );
  }

  return (
    <span title={title} className={`${base} bg-zinc-600`}>
      ?
    </span>
  );
}

export function mergeKanbanPickerUsers(
  crmList: readonly KanbanCrmUserRow[],
  boardUsers: KanbanUser[],
): Array<KanbanCrmUserRow | KanbanUser> {
  const seen = new Set<string>();
  const out: Array<KanbanCrmUserRow | KanbanUser> = [];
  for (const u of crmList) {
    if (!u?.id || seen.has(u.id)) continue;
    seen.add(u.id);
    out.push(u);
  }
  for (const u of boardUsers) {
    if (!u?.id || seen.has(u.id)) continue;
    seen.add(u.id);
    out.push(u);
  }
  return out;
}

export function pickerRowLabel(row: KanbanUser | KanbanCrmUserRow): string {
  if ("displayName" in row) return row.displayName;
  return row.name;
}
