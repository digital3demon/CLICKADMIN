"use client";

import { useId, useState, type ReactNode } from "react";
import type { KanbanBoard, KanbanUser } from "@/lib/kanban/types";
import {
  initialsFromDisplayName,
  kanbanFallbackAccentFromId,
  shortArcLabelFromDisplayName,
} from "@/lib/kanban/kanban-person-display";
import { profileAvatarEmoji } from "@/lib/profile-avatar-presets";
import type { KanbanCrmUserRow } from "./kanban-crm-users-context";
import { useKanbanCrmUsers } from "./kanban-crm-users-context";

const sizeClass = {
  xs: "h-[18px] w-[18px] text-[0.5rem]",
  /** Список mobile: аватар читаемый, не огромный */
  list: "h-7 w-7 text-[0.72rem]",
  sm: "h-6 w-6 text-[0.55rem]",
  card: "h-[22px] w-[22px] text-[0.58rem] max-md:h-[18px] max-md:w-[18px] max-md:text-[0.5rem]",
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
  /** Имя полукругом над кружком (mobile list). */
  nameArc?: boolean;
};

function AvatarNameArc({ label, pathId }: { label: string; pathId: string }) {
  if (!label) return null;
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-0 h-[12px] w-[48px] -translate-x-1/2 overflow-visible text-[var(--kanban-text)]"
      viewBox="0 0 48 12"
      aria-hidden
    >
      <defs>
        <path id={pathId} d="M 2 11.2 A 22.5 22.5 0 0 1 46 11.2" fill="none" />
      </defs>
      <text
        fill="currentColor"
        fontSize="8.25"
        fontWeight="600"
        letterSpacing="0.015em"
      >
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>
    </svg>
  );
}

export function KanbanPersonAvatar({
  userId,
  homeBoard,
  variant,
  size,
  className = "",
  titleSuffix,
  nameArc = false,
}: KanbanPersonAvatarProps) {
  const reactId = useId();
  const pathId = `kanban-name-arc-${reactId.replace(/:/g, "")}`;
  const [customPhotoFailed, setCustomPhotoFailed] = useState(false);
  const { byId } = useKanbanCrmUsers();
  const crm = byId.get(userId);
  const legacy = homeBoard.users.find((x) => x.id === userId);

  const displayName = crm?.displayName ?? legacy?.name ?? "Пользователь";
  const initials =
    legacy?.initials ??
    initialsFromDisplayName(crm?.displayName ?? crm?.email ?? displayName);
  const arcLabel = nameArc ? shortArcLabelFromDisplayName(displayName) : "";

  const ring =
    variant === "assignee"
      ? size === "card" || size === "list"
        ? "ring-1 ring-amber-400 ring-offset-1 ring-offset-[var(--kanban-card-bg)]"
        : size === "sm"
          ? "ring-1 ring-amber-500/80 ring-offset-1 ring-offset-[var(--kanban-card-bg)]"
          : "ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--kaiten-modal-bg)]"
      : size === "card" || size === "list"
        ? "border border-dashed border-[var(--kanban-text-muted)]"
        : "border-2 border-dashed border-[var(--kaiten-modal-muted)]";

  const base = `${sizeClass[size]} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${ring} ${className}`.trim();

  const title =
    titleSuffix != null
      ? `${displayName}${titleSuffix}`
      : `${displayName}${variant === "assignee" ? " (ответственный)" : " (участник)"}`;

  let face: ReactNode;
  if (crm?.avatarCustomUploadedAt && !customPhotoFailed) {
    const v = String(new Date(crm.avatarCustomUploadedAt).getTime() || 0);
    const src = `/api/user-avatars/${encodeURIComponent(userId)}?v=${encodeURIComponent(v)}`;
    face = (
      <span className={`${base} overflow-hidden bg-zinc-700 p-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setCustomPhotoFailed(true)}
        />
      </span>
    );
  } else if (crm && (crm.avatarPresetId || "").trim()) {
    const emoji = profileAvatarEmoji(crm.avatarPresetId);
    const bg = kanbanFallbackAccentFromId(userId);
    face = (
      <span className={base} style={{ background: bg }}>
        <span className="select-none leading-none" aria-hidden>
          {emoji}
        </span>
      </span>
    );
  } else if (legacy) {
    face = (
      <span className={base} style={{ background: legacy.color }}>
        {initials}
      </span>
    );
  } else if (crm) {
    const bg = kanbanFallbackAccentFromId(userId);
    face = (
      <span className={base} style={{ background: bg }}>
        {initials}
      </span>
    );
  } else {
    face = <span className={`${base} bg-zinc-600`}>?</span>;
  }

  if (!nameArc) {
    return (
      <span title={title} className="inline-flex">
        {face}
      </span>
    );
  }

  return (
    <span
      title={title}
      className="relative inline-flex w-[3rem] flex-col items-center pt-[11px]"
    >
      <AvatarNameArc label={arcLabel} pathId={pathId} />
      {face}
    </span>
  );
}

export function mergeKanbanPickerUsers(
  crmList: readonly KanbanCrmUserRow[],
  boardUsers: KanbanUser[],
  excludedCrmUserIds?: readonly string[] | null,
): Array<KanbanCrmUserRow | KanbanUser> {
  const excl = new Set(
    (excludedCrmUserIds || [])
      .map((x) => String(x || "").trim())
      .filter(Boolean),
  );
  const seen = new Set<string>();
  const out: Array<KanbanCrmUserRow | KanbanUser> = [];
  for (const u of crmList) {
    if (!u?.id || seen.has(u.id) || excl.has(u.id)) continue;
    seen.add(u.id);
    out.push(u);
  }
  for (const u of boardUsers) {
    if (!u?.id || seen.has(u.id) || excl.has(u.id)) continue;
    seen.add(u.id);
    out.push(u);
  }
  return out;
}

export function pickerRowLabel(row: KanbanUser | KanbanCrmUserRow): string {
  if ("displayName" in row) return row.displayName;
  return row.name;
}
